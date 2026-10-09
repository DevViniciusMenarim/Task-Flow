using TaskFlow.Application.DTOs;

namespace TaskFlow.Application.Interfaces;

public interface ISubtaskService
{
    Task<IReadOnlyList<SubtaskResponseDTO>> GetByTaskIdAsync(Guid taskId);
    Task<SubtaskResponseDTO> CreateAsync(Guid taskId, CreateSubtaskDTO dto, string? ifMatch);
    Task<SubtaskResponseDTO> UpdateAsync(Guid taskId, Guid subtaskId, UpdateSubtaskDTO dto, string? ifMatch);
    Task DeleteAsync(Guid taskId, Guid subtaskId, string? ifMatch);
}
