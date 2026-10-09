using TaskFlow.Domain.Enums;

namespace TaskFlow.Domain.Queries;

public sealed record TaskSearch(
    string? Query, TaskFlow.Domain.Enums.TaskStatus? Status, Guid? UserId, TaskPriority? Priority,
    DateTime? DueFrom, DateTime? DueBefore, bool ActiveOnly,
    int Page, int PageSize, TaskSort Sort);
