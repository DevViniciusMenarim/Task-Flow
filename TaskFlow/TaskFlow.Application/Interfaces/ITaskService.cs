using TaskFlow.Application.DTOs;

namespace TaskFlow.Application.Interfaces;

public interface ITaskService
{
    Task<TaskResponseDTO> CreateAsync(CreateTaskDTO dto);
    Task<IEnumerable<TaskResponseDTO>> GetAllAsync();
    Task<TaskResponseDTO?> GetByIdAsync(Guid id);
    Task UpdateAsync(Guid id, UpdateTaskDTO dto);
    Task DeleteAsync(Guid id);
    Task UpdateStatusAsync(Guid id, Domain.Enums.TaskStatus newStatus);
}