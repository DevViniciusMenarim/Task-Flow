using TaskFlow.Application.DTOs;
using TaskFlow.Application.Exceptions;
using TaskFlow.Application.Services;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskStatus = TaskFlow.Domain.Enums.TaskStatus;

namespace TaskFlow.Tests;

public sealed class TaskServiceTests
{
    [Fact]
    public async Task Update_changes_all_editable_fields_before_saving()
    {
        var tasks = new FakeTaskRepository();
        var users = new FakeUserRepository();
        var user = new User("Ana", "ana@example.com");
        users.Items.Add(user);
        var task = new TaskItem("Original", "Descrição antiga", user.Id);
        tasks.Items.Add(task);
        var dueDate = new DateTime(2026, 10, 3, 2, 30, 0, DateTimeKind.Utc);

        await new TaskService(tasks, users).UpdateAsync(
            task.Id, new UpdateTaskDTO("  Alterado  ", "  Nova descrição  ", dueDate),
            tasks.IfMatch(task));

        Assert.Equal("Alterado", task.Title);
        Assert.Equal("Nova descrição", task.Description);
        Assert.Equal(dueDate, task.DueDate);
        Assert.Equal(DateTimeKind.Utc, task.DueDate?.Kind);
        Assert.Equal(1, tasks.UpdateCount);
    }

    [Fact]
    public async Task Create_rejects_nonexistent_user_instead_of_reaching_foreign_key()
    {
        var tasks = new FakeTaskRepository();
        var service = new TaskService(tasks, new FakeUserRepository());

        await Assert.ThrowsAsync<ResourceNotFoundException>(() =>
            service.CreateAsync(new CreateTaskDTO("Tarefa", "Descrição", Guid.NewGuid(), null)));

        Assert.Empty(tasks.Items);
    }

    [Fact]
    public async Task Create_rejects_empty_user_id()
    {
        var service = new TaskService(new FakeTaskRepository(), new FakeUserRepository());

        await Assert.ThrowsAsync<InvalidRequestException>(() =>
            service.CreateAsync(new CreateTaskDTO("Tarefa", "Descrição", Guid.Empty, null)));
    }

    [Fact]
    public async Task Create_rejects_oversized_title_and_ambiguous_due_date()
    {
        var users = new FakeUserRepository();
        var user = new User("Ana", "ana@example.com");
        users.Items.Add(user);
        var service = new TaskService(new FakeTaskRepository(), users);

        await Assert.ThrowsAsync<InvalidRequestException>(() =>
            service.CreateAsync(new CreateTaskDTO(new string('x', 201), "Descrição", user.Id, null)));

        var withoutOffset = new DateTime(2026, 10, 2, 23, 30, 0, DateTimeKind.Unspecified);
        await Assert.ThrowsAsync<InvalidRequestException>(() =>
            service.CreateAsync(new CreateTaskDTO("Tarefa", "Descrição", user.Id, withoutOffset)));
    }

    [Fact]
    public async Task Status_rejects_undefined_enum_without_saving()
    {
        var tasks = new FakeTaskRepository();
        var task = new TaskItem("Tarefa", "Descrição", Guid.NewGuid());
        tasks.Items.Add(task);

        await Assert.ThrowsAsync<InvalidRequestException>(() =>
            new TaskService(tasks, new FakeUserRepository()).UpdateStatusAsync(task.Id, (TaskStatus)99));

        Assert.Equal(TaskStatus.Pending, task.Status);
        Assert.Equal(0, tasks.UpdateCount);
    }

    [Fact]
    public async Task Update_of_missing_task_returns_not_found()
    {
        var service = new TaskService(new FakeTaskRepository(), new FakeUserRepository());

        await Assert.ThrowsAsync<ResourceNotFoundException>(() =>
            service.UpdateAsync(Guid.NewGuid(), new UpdateTaskDTO("Tarefa", "Descrição", null)));
    }

    [Fact]
    public async Task Create_and_update_keep_priority_assignee_and_allow_reopening()
    {
        var tasks = new FakeTaskRepository();
        var users = new FakeUserRepository();
        var first = new User("Ana", "ana@example.com");
        var second = new User("Bia", "bia@example.com");
        users.Items.AddRange([first, second]);
        var service = new TaskService(tasks, users);

        var created = await service.CreateAsync(new CreateTaskDTO(
            "Revisar", "Descrição", first.Id, null, TaskPriority.Low));
        Assert.Equal(TaskPriority.Low, created.Priority);
        Assert.Equal(first.Id, created.UserId);

        await service.UpdateStatusAsync(created.Id, TaskStatus.Completed,
            tasks.IfMatch(tasks.Items[0]));
        await service.UpdateAsync(created.Id, new UpdateTaskDTO(
            "Revisar", "Descrição", null, second.Id, TaskPriority.High),
            tasks.IfMatch(tasks.Items[0]));
        await service.UpdateStatusAsync(created.Id, TaskStatus.Pending,
            tasks.IfMatch(tasks.Items[0]));

        var updated = await service.GetByIdAsync(created.Id);
        Assert.NotNull(updated);
        Assert.Equal(second.Id, updated.UserId);
        Assert.Equal(TaskPriority.High, updated.Priority);
        Assert.Equal(TaskStatus.Pending, updated.Status);
    }

    [Fact]
    public async Task Update_rejects_unknown_assignee_and_priority_without_saving()
    {
        var tasks = new FakeTaskRepository();
        var users = new FakeUserRepository();
        var user = new User("Ana", "ana@example.com");
        users.Items.Add(user);
        var task = new TaskItem("Original", "Descrição", user.Id);
        tasks.Items.Add(task);
        var service = new TaskService(tasks, users);

        await Assert.ThrowsAsync<ResourceNotFoundException>(() => service.UpdateAsync(task.Id,
            new UpdateTaskDTO("Novo", "Descrição", null, Guid.NewGuid()), tasks.IfMatch(task)));
        await Assert.ThrowsAsync<InvalidRequestException>(() => service.UpdateAsync(task.Id,
            new UpdateTaskDTO("Novo", "Descrição", null, null, (TaskPriority)99), tasks.IfMatch(task)));

        Assert.Equal("Original", task.Title);
        Assert.Equal(user.Id, task.UserId);
        Assert.Equal(0, tasks.UpdateCount);
    }

    [Fact]
    public async Task Search_filters_and_pages_with_exclusive_due_before()
    {
        var tasks = new FakeTaskRepository();
        var user = Guid.NewGuid();
        var otherUser = Guid.NewGuid();
        var from = new DateTime(2026, 10, 2, 0, 0, 0, DateTimeKind.Utc);
        tasks.Items.Add(new TaskItem("Revisar A", "Documento", user, from.AddHours(2), TaskPriority.High));
        tasks.Items.Add(new TaskItem("Revisar B", "Documento", user, from.AddHours(3), TaskPriority.Low));
        tasks.Items.Add(new TaskItem("Revisar C", "Documento", user, from.AddHours(4), TaskPriority.High));
        tasks.Items.Add(new TaskItem("Revisar D", "Documento", otherUser, from.AddHours(2), TaskPriority.High));
        tasks.Items[2].UpdateStatus(TaskStatus.Completed);
        var service = new TaskService(tasks, new FakeUserRepository());

        var result = await service.SearchAsync(new TaskSearchDTO("  Revisar  ", null,
            user, null, from, from.AddHours(4), true, 1, 1, "dueAsc"));
        var secondPage = await service.SearchAsync(new TaskSearchDTO("Revisar", null,
            user, null, from, from.AddHours(4), true, 2, 1, "dueAsc"));

        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.TotalPages);
        Assert.Equal("Revisar A", Assert.Single(result.Items).Title);
        Assert.Equal("Revisar B", Assert.Single(secondPage.Items).Title);
    }

    [Fact]
    public async Task Search_rejects_invalid_enum_date_and_offset_overflow()
    {
        var service = new TaskService(new FakeTaskRepository(), new FakeUserRepository());
        await Assert.ThrowsAsync<InvalidRequestException>(() => service.SearchAsync(
            new TaskSearchDTO(null, (TaskStatus)99, null, null, null, null)));
        await Assert.ThrowsAsync<InvalidRequestException>(() => service.SearchAsync(
            new TaskSearchDTO(null, null, null, null, DateTime.SpecifyKind(DateTime.Today,
                DateTimeKind.Unspecified), null)));
        await Assert.ThrowsAsync<InvalidRequestException>(() => service.SearchAsync(
            new TaskSearchDTO(null, null, null, null, null, null, false,
                int.MaxValue, 100)));
    }

    [Fact]
    public async Task Update_requires_current_version_before_mutating_task()
    {
        var tasks = new FakeTaskRepository();
        var user = new User("Ana", "ana@example.com");
        var users = new FakeUserRepository();
        users.Items.Add(user);
        var task = new TaskItem("Original", "Descrição", user.Id);
        tasks.Items.Add(task);
        var service = new TaskService(tasks, users);
        var oldVersion = tasks.IfMatch(task);

        await Assert.ThrowsAsync<ResourceConflictException>(() => service.UpdateAsync(task.Id,
            new UpdateTaskDTO("Novo", "Descrição", null)));
        await service.UpdateStatusAsync(task.Id, TaskStatus.InProgress, oldVersion);
        await Assert.ThrowsAsync<ResourceConflictException>(() => service.UpdateAsync(task.Id,
            new UpdateTaskDTO("Novo", "Descrição", null), oldVersion));

        Assert.Equal("Original", task.Title);
        Assert.Equal(TaskStatus.InProgress, task.Status);
        Assert.Equal(1, tasks.UpdateCount);
    }

    [Fact]
    public async Task Delete_requires_current_version_and_preserves_a_concurrently_changed_task()
    {
        var tasks = new FakeTaskRepository();
        var task = new TaskItem("Original", "Descrição", Guid.NewGuid());
        tasks.Items.Add(task);
        var service = new TaskService(tasks, new FakeUserRepository());
        var oldVersion = tasks.IfMatch(task);

        await Assert.ThrowsAsync<ResourceConflictException>(() => service.DeleteAsync(task.Id));
        Assert.Contains(task, tasks.Items);

        await service.UpdateStatusAsync(task.Id, TaskStatus.InProgress, oldVersion);
        await Assert.ThrowsAsync<ResourceConflictException>(() => service.DeleteAsync(task.Id, oldVersion));
        Assert.Contains(task, tasks.Items);

        await service.DeleteAsync(task.Id, tasks.IfMatch(task));
        Assert.Empty(tasks.Items);
    }

    [Fact]
    public async Task Due_summary_counts_active_tasks_in_three_exclusive_windows()
    {
        var tasks = new FakeTaskRepository();
        var start = new DateTime(2026, 10, 3, 0, 0, 0, DateTimeKind.Utc);
        var userId = Guid.NewGuid();
        tasks.Items.Add(new TaskItem("Atrasada", "Descrição", userId, start.AddMinutes(-1)));
        tasks.Items.Add(new TaskItem("Hoje", "Descrição", userId, start.AddHours(12)));
        tasks.Items.Add(new TaskItem("Semana", "Descrição", userId, start.AddDays(3)));
        var completed = new TaskItem("Concluída", "Descrição", userId, start.AddHours(12));
        completed.UpdateStatus(TaskStatus.Completed);
        tasks.Items.Add(completed);
        var service = new TaskService(tasks, new FakeUserRepository());

        var summary = await service.GetDueSummaryAsync(start, start.AddDays(1), start.AddDays(8));
        Assert.Equal((1, 1, 1), (summary.Overdue, summary.Today, summary.Week));
        await Assert.ThrowsAsync<InvalidRequestException>(() => service.GetDueSummaryAsync(
            DateTime.SpecifyKind(start, DateTimeKind.Unspecified),
            start.AddDays(1), start.AddDays(8)));
    }
}
