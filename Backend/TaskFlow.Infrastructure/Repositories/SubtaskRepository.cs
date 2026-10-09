using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Exceptions;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Interfaces;
using TaskFlow.Infrastructure.Context;

namespace TaskFlow.Infrastructure.Repositories;

public sealed class SubtaskRepository(AppDbContext context) : ISubtaskRepository
{
    public async Task<IReadOnlyList<SubtaskItem>> GetByTaskIdAsync(Guid taskId) =>
        await context.Subtasks.AsNoTracking().Where(s => s.TaskId == taskId)
            .OrderBy(s => s.CreatedAt).ThenBy(s => s.Id).ToListAsync();

    public Task<SubtaskItem?> GetByIdAsync(Guid taskId, Guid id) =>
        context.Subtasks.FirstOrDefaultAsync(s => s.TaskId == taskId && s.Id == id);

    public async Task AddAsync(SubtaskItem subtask)
    {
        await AdvanceParentVersionAsync(subtask.TaskId);
        await context.Subtasks.AddAsync(subtask);
        await SaveChangesAsync();
    }

    public async Task UpdateAsync(SubtaskItem subtask)
    {
        await AdvanceParentVersionAsync(subtask.TaskId);
        await SaveChangesAsync();
    }

    public async Task DeleteAsync(SubtaskItem subtask)
    {
        await AdvanceParentVersionAsync(subtask.TaskId);
        context.Subtasks.Remove(subtask);
        await SaveChangesAsync();
    }

    private async Task AdvanceParentVersionAsync(Guid taskId)
    {
        var parent = await context.Tasks.FindAsync(taskId)
            ?? throw new ResourceNotFoundException("Tarefa não encontrada.");
        // Force an UPDATE without changing status so SQL Server advances RowVersion.
        // SaveChanges commits the parent version and checklist change together.
        context.Entry(parent).Property(task => task.Status).IsModified = true;
    }

    private async Task SaveChangesAsync()
    {
        try
        {
            await context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ResourceConflictException(
                "A tarefa ou checklist foi alterada por outra requisição. Recarregue antes de salvar.");
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 547 })
        {
            throw new ResourceNotFoundException("Tarefa não encontrada.");
        }
    }
}
