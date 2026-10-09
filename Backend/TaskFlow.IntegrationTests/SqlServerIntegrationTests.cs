using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Data.SqlClient;
using TaskFlow.Application.DTOs;
using TaskFlow.Application.Exceptions;
using TaskFlow.Application.Services;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskFlow.Infrastructure.Context;
using TaskFlow.Infrastructure.Repositories;
using Xunit;

namespace TaskFlow.IntegrationTests;

[CollectionDefinition("SqlServer", DisableParallelization = true)]
public sealed class SqlServerCollection { }

[Collection("SqlServer")]
public sealed class SqlServerIntegrationTests
{
    [Fact]
    public async Task Existing_case_sensitive_database_migrates_email_without_losing_users()
    {
        await using var database = await IntegrationDatabase.CreateAsync(caseSensitive: true);
        var options = Options(database.ConnectionString);
        var userId = Guid.NewGuid();

        await using (var oldContext = new AppDbContext(options))
        {
            await oldContext.GetService<IMigrator>().MigrateAsync(
                "20261002210805_AddTaskRowVersionAndUserSearch");
            await oldContext.Database.ExecuteSqlInterpolatedAsync(
                $"INSERT INTO [Users] ([Id], [Name], [Email]) VALUES ({userId}, {"Ana"}, {"Ana@Example.com"})");
            await oldContext.Database.MigrateAsync();
        }

        await using var context = new AppDbContext(options);
        var repository = new UserRepository(context);
        Assert.Equal(userId, (await repository.GetByEmailAsync("ana@example.com"))?.Id);
        Assert.Equal("Ana@Example.com",
            (await context.Users.AsNoTracking().SingleAsync()).Email);
        await Assert.ThrowsAsync<ResourceConflictException>(() =>
            repository.AddAsync(new User("Outra", "ana@example.com")));
        Assert.Empty(await context.Database.GetPendingMigrationsAsync());
    }

    [Fact]
    public async Task Email_migration_rejects_case_duplicates_without_changing_existing_data()
    {
        await using var database = await IntegrationDatabase.CreateAsync(caseSensitive: true);
        var options = Options(database.ConnectionString);
        await using (var oldContext = new AppDbContext(options))
        {
            await oldContext.GetService<IMigrator>().MigrateAsync(
                "20261002210805_AddTaskRowVersionAndUserSearch");
            await oldContext.Database.ExecuteSqlInterpolatedAsync(
                $"INSERT INTO [Users] ([Id], [Name], [Email]) VALUES ({Guid.NewGuid()}, {"Ana"}, {"Ana@Example.com"})");
            await oldContext.Database.ExecuteSqlInterpolatedAsync(
                $"INSERT INTO [Users] ([Id], [Name], [Email]) VALUES ({Guid.NewGuid()}, {"Outra"}, {"ana@example.com"})");

            var error = await Assert.ThrowsAsync<SqlException>(
                () => oldContext.Database.MigrateAsync());
            Assert.Equal(51000, error.Number);
        }

        await using var verify = new AppDbContext(options);
        Assert.Equal(2, await verify.Users.CountAsync());
        Assert.Equal(2, await verify.Users.Select(user => user.Email).Distinct().CountAsync());
        Assert.Contains("20261008035103_SetUserEmailCaseInsensitive",
            await verify.Database.GetPendingMigrationsAsync());
    }
    [Fact]
    public async Task Fresh_database_applies_all_migrations()
    {
        await using var database = await IntegrationDatabase.CreateAsync();
        var options = Options(database.ConnectionString);
        await using var context = new AppDbContext(options);

        await context.Database.MigrateAsync();

        var applied = (await context.Database.GetAppliedMigrationsAsync()).ToArray();
        Assert.Contains("20260323033034_InitialCreate", applied);
        Assert.Contains("20261002090126_AddTaskFeatures", applied);
        Assert.Contains("20261002210805_AddTaskRowVersionAndUserSearch", applied);
        Assert.Contains("20261008035103_SetUserEmailCaseInsensitive", applied);
        Assert.Empty(await context.Database.GetPendingMigrationsAsync());
    }

    [Fact]
    public async Task Legacy_database_keeps_tasks_when_features_are_added()
    {
        await using var database = await IntegrationDatabase.CreateAsync();
        var options = Options(database.ConnectionString);
        var userId = Guid.NewGuid();
        var taskId = Guid.NewGuid();

        await using (var context = new AppDbContext(options))
        {
            await context.GetService<IMigrator>().MigrateAsync("20260323033034_InitialCreate");
            await context.Database.ExecuteSqlInterpolatedAsync(
                $"INSERT INTO [Users] ([Id], [Name], [Email]) VALUES ({userId}, {"Ana"}, {"ana@example.com"})");
            await context.Database.ExecuteSqlInterpolatedAsync(
                $"INSERT INTO [Tasks] ([Id], [Title], [Description], [CreatedAt], [DueDate], [Status], [UserId]) VALUES ({taskId}, {"Legado"}, {"Descrição"}, {new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc)}, NULL, {0}, {userId})");
            await context.Database.MigrateAsync();
        }

        await using var verify = new AppDbContext(options);
        var task = await verify.Tasks.AsNoTracking().SingleAsync(item => item.Id == taskId);
        Assert.Equal("Legado", task.Title);
        Assert.Equal(userId, task.UserId);
        Assert.Equal(TaskPriority.Normal, task.Priority);
        Assert.Equal(8, task.RowVersion.Length);
        Assert.Empty(await verify.Database.GetPendingMigrationsAsync());
    }

    [Fact]
    public async Task Real_repository_filters_sorts_and_pages_tasks()
    {
        await using var database = await IntegrationDatabase.CreateAsync();
        var options = Options(database.ConnectionString);
        await using var context = new AppDbContext(options);
        await context.Database.MigrateAsync();

        var user = new User("Ana", "ana@example.com");
        context.Users.AddRange(user, new User("Bruno", "bruno@example.com"),
            new User("Carla", "carla@example.com"));
        context.Tasks.AddRange(
            new TaskItem("Relatório B", "Conferir dados", user.Id,
                new DateTime(2026, 10, 12, 12, 0, 0, DateTimeKind.Utc), TaskPriority.High),
            new TaskItem("Relatório A", "Conferir dados", user.Id,
                new DateTime(2026, 10, 10, 12, 0, 0, DateTimeKind.Utc), TaskPriority.High),
            new TaskItem("Outra tarefa", "Outro assunto", user.Id, null, TaskPriority.Low));
        await context.SaveChangesAsync();

        var service = new TaskService(new TaskRepository(context), new UserRepository(context));
        var first = await service.SearchAsync(new TaskSearchDTO("Relatório", null, user.Id,
            TaskPriority.High, null, null, true, 1, 1, "dueAsc"));
        var second = await service.SearchAsync(new TaskSearchDTO("Relatório", null, user.Id,
            TaskPriority.High, null, null, true, 2, 1, "dueAsc"));

        Assert.Equal(2, first.TotalCount);
        Assert.Equal(2, first.TotalPages);
        Assert.Equal("Relatório A", Assert.Single(first.Items).Title);
        Assert.Equal("Relatório B", Assert.Single(second.Items).Title);
        Assert.Equal("Ana", first.Items[0].UserName);
        Assert.Equal(DateTimeKind.Utc, first.Items[0].DueDate?.Kind);

        var summary = await service.GetDueSummaryAsync(
            new DateTime(2026, 10, 11, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 10, 12, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 10, 19, 0, 0, 0, DateTimeKind.Utc));
        Assert.Equal(1, summary.Overdue);
        Assert.Equal(0, summary.Today);
        Assert.Equal(1, summary.Week);

        var users = new UserService(new UserRepository(context));
        var firstUsers = await users.SearchAsync(null, 1, 2);
        var lastUsers = await users.SearchAsync(null, 2, 2);
        Assert.Equal(3, firstUsers.TotalCount);
        Assert.Equal(2, firstUsers.TotalPages);
        Assert.Equal(new[] { "Ana", "Bruno" }, firstUsers.Items.Select(item => item.Name));
        Assert.Equal("Carla", Assert.Single(lastUsers.Items).Name);
        Assert.Equal("Ana", Assert.Single((await users.SearchAsync("ana", 1, 20)).Items).Name);
    }

    [Fact]
    public async Task Concurrent_edits_preserve_the_first_committed_change()
    {
        await using var database = await IntegrationDatabase.CreateAsync();
        var options = Options(database.ConnectionString);
        Guid taskId;
        await using (var seed = new AppDbContext(options))
        {
            await seed.Database.MigrateAsync();
            var user = new User("Ana", "ana@example.com");
            var task = new TaskItem("Original", "Descrição", user.Id);
            seed.Users.Add(user);
            seed.Tasks.Add(task);
            await seed.SaveChangesAsync();
            taskId = task.Id;
        }

        await using var firstContext = new AppDbContext(options);
        await using var secondContext = new AppDbContext(options);
        var firstRepository = new TaskRepository(firstContext);
        var secondRepository = new TaskRepository(secondContext);
        var first = (await firstRepository.GetByIdAsync(taskId))!;
        var second = (await secondRepository.GetByIdAsync(taskId))!;

        first.UpdateStatus(TaskFlow.Domain.Enums.TaskStatus.InProgress);
        await firstRepository.UpdateAsync(first);
        second.UpdateDetails("Título atrasado", "Descrição", null);
        await Assert.ThrowsAsync<ResourceConflictException>(() => secondRepository.UpdateAsync(second));

        await using var verify = new AppDbContext(options);
        var stored = await verify.Tasks.AsNoTracking().SingleAsync(item => item.Id == taskId);
        Assert.Equal("Original", stored.Title);
        Assert.Equal(TaskFlow.Domain.Enums.TaskStatus.InProgress, stored.Status);
    }

    [Fact]
    public async Task Checklist_mutations_advance_parent_version_and_reject_stale_delete()
    {
        await using var database = await IntegrationDatabase.CreateAsync();
        var options = Options(database.ConnectionString);
        Guid taskId;
        byte[] originalVersion;
        await using (var seed = new AppDbContext(options))
        {
            await seed.Database.MigrateAsync();
            var user = new User("Ana", "ana@example.com");
            var task = new TaskItem("Tarefa", "Descrição", user.Id);
            seed.Users.Add(user);
            seed.Tasks.Add(task);
            await seed.SaveChangesAsync();
            taskId = task.Id;
            originalVersion = task.RowVersion.ToArray();
        }

        async Task<byte[]> CurrentVersionAsync()
        {
            await using var read = new AppDbContext(options);
            return (await read.Tasks.AsNoTracking().SingleAsync(task => task.Id == taskId))
                .RowVersion;
        }

        await using var checklistContext = new AppDbContext(options);
        var checklist = new SubtaskRepository(checklistContext);
        var subtask = new SubtaskItem(taskId, "Primeira");
        await checklist.AddAsync(subtask);
        var afterAdd = await CurrentVersionAsync();
        Assert.False(originalVersion.SequenceEqual(afterAdd));

        await using (var staleChecklistContext = new AppDbContext(options))
        {
            var staleChecklist = new SubtaskService(new TaskRepository(staleChecklistContext),
                new SubtaskRepository(staleChecklistContext));
            await Assert.ThrowsAsync<ResourceConflictException>(() => staleChecklist.UpdateAsync(
                taskId, subtask.Id, new UpdateSubtaskDTO("Alteração antiga", true),
                $"\"{Convert.ToBase64String(originalVersion)}\""));
        }

        await using (var staleDeleteContext = new AppDbContext(options))
        {
            var tasks = new TaskService(new TaskRepository(staleDeleteContext),
                new UserRepository(staleDeleteContext));
            await Assert.ThrowsAsync<ResourceConflictException>(() => tasks.DeleteAsync(taskId,
                $"\"{Convert.ToBase64String(originalVersion)}\""));
        }

        subtask.Update("Renomeada", true);
        await checklist.UpdateAsync(subtask);
        var afterUpdate = await CurrentVersionAsync();
        Assert.False(afterAdd.SequenceEqual(afterUpdate));

        await checklist.DeleteAsync(subtask);
        var afterDelete = await CurrentVersionAsync();
        Assert.False(afterUpdate.SequenceEqual(afterDelete));

        await using var verify = new AppDbContext(options);
        Assert.True(await verify.Tasks.AnyAsync(task => task.Id == taskId));
        Assert.False(await verify.Subtasks.AnyAsync(item => item.TaskId == taskId));
    }

    [Fact]
    public async Task Concurrent_parent_change_rolls_back_checklist_insert()
    {
        await using var database = await IntegrationDatabase.CreateAsync();
        var options = Options(database.ConnectionString);
        Guid taskId;
        await using (var seed = new AppDbContext(options))
        {
            await seed.Database.MigrateAsync();
            var user = new User("Ana", "ana@example.com");
            var task = new TaskItem("Tarefa", "Descrição", user.Id);
            seed.Users.Add(user);
            seed.Tasks.Add(task);
            await seed.SaveChangesAsync();
            taskId = task.Id;
        }

        await using var staleChecklistContext = new AppDbContext(options);
        await staleChecklistContext.Tasks.FindAsync(taskId);
        await using (var editorContext = new AppDbContext(options))
        {
            var tasks = new TaskRepository(editorContext);
            var task = (await tasks.GetByIdAsync(taskId))!;
            task.UpdateStatus(TaskFlow.Domain.Enums.TaskStatus.InProgress);
            await tasks.UpdateAsync(task);
        }

        var checklist = new SubtaskRepository(staleChecklistContext);
        await Assert.ThrowsAsync<ResourceConflictException>(() => checklist.AddAsync(
            new SubtaskItem(taskId, "Não deve persistir")));

        await using var verify = new AppDbContext(options);
        Assert.False(await verify.Subtasks.AnyAsync(item => item.TaskId == taskId));
        Assert.Equal(TaskFlow.Domain.Enums.TaskStatus.InProgress,
            (await verify.Tasks.SingleAsync(task => task.Id == taskId)).Status);
    }

    private static DbContextOptions<AppDbContext> Options(string connectionString) =>
        new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(connectionString).Options;
}
