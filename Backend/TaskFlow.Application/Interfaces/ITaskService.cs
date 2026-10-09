using TaskFlow.Application.DTOs;

namespace TaskFlow.Application.Interfaces;

public interface ITaskService
{
    Task<TaskResponseDTO> CreateAsync(CreateTaskDTO dto);
    Task<PagedTasksDTO> SearchAsync(TaskSearchDTO search);
    Task<TaskDueSummaryDTO> GetDueSummaryAsync(DateTime? start, DateTime? tomorrow, DateTime? afterNextWeek);
    Task<TaskResponseDTO?> GetByIdAsync(Guid id);
    Task UpdateAsync(Guid id, UpdateTaskDTO dto, string? ifMatch = null);
    Task DeleteAsync(Guid id, string? ifMatch = null);
    Task UpdateStatusAsync(Guid id, Domain.Enums.TaskStatus newStatus, string? ifMatch = null);
}
