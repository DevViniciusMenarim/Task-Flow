using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.DTOs;

public record CreateTaskDTO(string Title, string Description, Guid UserId, DateTime? DueDate);

public record UpdateTaskDTO(string Title, string Description, DateTime? DueDate);

public record TaskResponseDTO(Guid Id, string Title, string Description, DateTime CreatedAt, DateTime? DueDate, TaskFlow.Domain.Enums.TaskStatus Status);