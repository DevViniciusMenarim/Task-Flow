using System.ComponentModel.DataAnnotations;
using TaskFlow.Domain;

namespace TaskFlow.Application.DTOs;

public record CreateSubtaskDTO([param: Required, StringLength(FieldRules.SubtaskTitleMaxLength)] string Title);

public record UpdateSubtaskDTO(string? Title, bool? IsCompleted);

public record SubtaskResponseDTO(Guid Id, Guid TaskId, string Title, bool IsCompleted,
    DateTime CreatedAt);
