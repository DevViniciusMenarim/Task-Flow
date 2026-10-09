using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Queries;

namespace TaskFlow.Domain.Interfaces;

public interface ITaskRepository
{
    Task<PagedResult<TaskItem>> SearchAsync(TaskSearch search);
    Task<TaskDueSummary> GetDueSummaryAsync(DateTime start, DateTime tomorrow, DateTime afterNextWeek);
    Task<TaskItem?> GetByIdAsync(Guid id);
    Task AddAsync(TaskItem task);
    Task UpdateAsync(TaskItem task);
    Task DeleteAsync(TaskItem task);
}
