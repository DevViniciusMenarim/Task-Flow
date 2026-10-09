namespace TaskFlow.Domain.Queries;

public sealed record TaskDueSummary(int Overdue, int Today, int Week);
