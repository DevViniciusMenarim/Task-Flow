namespace TaskFlow.Domain.Queries;

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount);
