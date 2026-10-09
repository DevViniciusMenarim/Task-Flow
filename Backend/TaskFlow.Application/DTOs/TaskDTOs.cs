using System.ComponentModel.DataAnnotations;
using TaskFlow.Domain;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.DTOs;

public record CreateTaskDTO(
    [param: Required, StringLength(FieldRules.TaskTitleMaxLength)] string Title,
    [param: Required, StringLength(FieldRules.TaskDescriptionMaxLength)] string Description,
    Guid UserId,
    DateTime? DueDate,
    TaskPriority? Priority = null);

public record UpdateTaskDTO(
    [param: Required, StringLength(FieldRules.TaskTitleMaxLength)] string Title,
    [param: Required, StringLength(FieldRules.TaskDescriptionMaxLength)] string Description,
    DateTime? DueDate,
    Guid? UserId = null,
    TaskPriority? Priority = null);

public record TaskResponseDTO(Guid Id, string Title, string Description, DateTime CreatedAt,
    DateTime? DueDate, TaskFlow.Domain.Enums.TaskStatus Status, Guid UserId, TaskPriority Priority,
    string UserName, string RowVersion);

public record TaskSearchDTO(string? Q, TaskFlow.Domain.Enums.TaskStatus? Status, Guid? UserId,
    TaskPriority? Priority, DateTime? DueFrom, DateTime? DueBefore,
    bool ActiveOnly = false, int Page = 1, int PageSize = 20, string Sort = "createdDesc");

public record PagedTasksDTO(IReadOnlyList<TaskResponseDTO> Items, int Page, int PageSize,
    int TotalCount, int TotalPages);

public record TaskDueSummaryDTO(int Overdue, int Today, int Week);
