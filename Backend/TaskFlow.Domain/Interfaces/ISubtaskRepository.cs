using TaskFlow.Domain.Entities;

namespace TaskFlow.Domain.Interfaces;

public interface ISubtaskRepository
{
    Task<IReadOnlyList<SubtaskItem>> GetByTaskIdAsync(Guid taskId);
    Task<SubtaskItem?> GetByIdAsync(Guid taskId, Guid id);
    // Each write also advances the parent task's RowVersion in the same database transaction.
    Task AddAsync(SubtaskItem subtask);
    Task UpdateAsync(SubtaskItem subtask);
    Task DeleteAsync(SubtaskItem subtask);
}
