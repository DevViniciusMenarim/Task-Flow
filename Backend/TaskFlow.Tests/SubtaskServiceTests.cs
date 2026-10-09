using TaskFlow.Application.DTOs;
using TaskFlow.Application.Exceptions;
using TaskFlow.Application.Services;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Tests;

public sealed class SubtaskServiceTests
{
    [Fact]
    public async Task Checklist_is_scoped_to_parent_and_can_be_edited_and_deleted()
    {
        var tasks = new FakeTaskRepository();
        var subtasks = new FakeSubtaskRepository(tasks);
        var first = new TaskItem("Primeira", "Descrição", Guid.NewGuid());
        var second = new TaskItem("Segunda", "Descrição", Guid.NewGuid());
        tasks.Items.AddRange([first, second]);
        var service = new SubtaskService(tasks, subtasks);

        var created = await service.CreateAsync(first.Id, new CreateSubtaskDTO("  Etapa  "), tasks.IfMatch(first));
        Assert.Equal("Etapa", created.Title);
        Assert.Equal(first.Id, created.TaskId);
        Assert.Equal(DateTimeKind.Utc, created.CreatedAt.Kind);

        await Assert.ThrowsAsync<ResourceNotFoundException>(() => service.UpdateAsync(
            second.Id, created.Id, new UpdateSubtaskDTO(null, true), tasks.IfMatch(second)));
        await Assert.ThrowsAsync<ResourceNotFoundException>(() => service.DeleteAsync(
            second.Id, created.Id, tasks.IfMatch(second)));

        var updated = await service.UpdateAsync(first.Id, created.Id,
            new UpdateSubtaskDTO("Outra etapa", true), tasks.IfMatch(first));
        Assert.True(updated.IsCompleted);
        Assert.Equal("Outra etapa", updated.Title);
        Assert.Single(await service.GetByTaskIdAsync(first.Id));
        Assert.Empty(await service.GetByTaskIdAsync(second.Id));

        await service.DeleteAsync(first.Id, created.Id, tasks.IfMatch(first));
        Assert.Empty(await service.GetByTaskIdAsync(first.Id));
    }

    [Fact]
    public async Task Checklist_rejects_missing_parent_and_empty_patch()
    {
        var service = new SubtaskService(new FakeTaskRepository(), new FakeSubtaskRepository());
        await Assert.ThrowsAsync<ResourceNotFoundException>(() => service.CreateAsync(
            Guid.NewGuid(), new CreateSubtaskDTO("Etapa"), null));
        await Assert.ThrowsAsync<InvalidRequestException>(() => service.UpdateAsync(
            Guid.NewGuid(), Guid.NewGuid(), new UpdateSubtaskDTO(null, null), null));
    }

    [Fact]
    public async Task Checklist_rejects_stale_parent_version_before_mutating_items()
    {
        var tasks = new FakeTaskRepository();
        var parent = new TaskItem("Tarefa", "Descrição", Guid.NewGuid());
        tasks.Items.Add(parent);
        var subtasks = new FakeSubtaskRepository(tasks);
        var service = new SubtaskService(tasks, subtasks);
        var originalVersion = tasks.IfMatch(parent);

        var created = await service.CreateAsync(parent.Id, new CreateSubtaskDTO("Primeira"), originalVersion);
        await Assert.ThrowsAsync<ResourceConflictException>(() => service.UpdateAsync(
            parent.Id, created.Id, new UpdateSubtaskDTO("Título antigo", true), originalVersion));
        await Assert.ThrowsAsync<ResourceConflictException>(() => service.DeleteAsync(
            parent.Id, created.Id, originalVersion));
        await Assert.ThrowsAsync<ResourceConflictException>(() => service.CreateAsync(
            parent.Id, new CreateSubtaskDTO("Segunda"), null));

        Assert.Equal("Primeira", Assert.Single(subtasks.Items).Title);
        Assert.False(created.IsCompleted);

        await service.UpdateAsync(parent.Id, created.Id,
            new UpdateSubtaskDTO("Atualizada", true), tasks.IfMatch(parent));
        Assert.Equal("Atualizada", Assert.Single(subtasks.Items).Title);
    }
}
