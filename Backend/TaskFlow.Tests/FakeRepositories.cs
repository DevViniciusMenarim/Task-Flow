using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskFlow.Domain.Interfaces;
using TaskFlow.Domain.Queries;

namespace TaskFlow.Tests;

internal sealed class FakeTaskRepository : ITaskRepository
{
    private static readonly System.Reflection.PropertyInfo VersionProperty =
        typeof(TaskItem).GetProperty(nameof(TaskItem.RowVersion))!;
    private long _nextVersion = 1;
    public List<TaskItem> Items { get; } = [];
    public int UpdateCount { get; private set; }

    private void EnsureVersion(TaskItem task)
    {
        if (task.RowVersion.Length == 0)
            VersionProperty.SetValue(task, BitConverter.GetBytes(_nextVersion++));
    }

    public string IfMatch(TaskItem task)
    {
        EnsureVersion(task);
        return $"\"{Convert.ToBase64String(task.RowVersion)}\"";
    }

    public void AdvanceVersion(Guid taskId)
    {
        var task = Items.Single(item => item.Id == taskId);
        VersionProperty.SetValue(task, BitConverter.GetBytes(_nextVersion++));
    }

    public Task<PagedResult<TaskItem>> SearchAsync(TaskSearch search)
    {
        Items.ForEach(EnsureVersion);
        IEnumerable<TaskItem> query = Items;
        if (!string.IsNullOrWhiteSpace(search.Query))
            query = query.Where(t => t.Title.Contains(search.Query, StringComparison.OrdinalIgnoreCase)
                || t.Description.Contains(search.Query, StringComparison.OrdinalIgnoreCase));
        if (search.Status.HasValue)
            query = query.Where(t => t.Status == search.Status.Value);
        if (search.UserId.HasValue)
            query = query.Where(t => t.UserId == search.UserId.Value);
        if (search.Priority.HasValue)
            query = query.Where(t => t.Priority == search.Priority.Value);
        if (search.DueFrom.HasValue)
            query = query.Where(t => t.DueDate >= search.DueFrom.Value);
        if (search.DueBefore.HasValue)
            query = query.Where(t => t.DueDate < search.DueBefore.Value);
        if (search.ActiveOnly)
            query = query.Where(t => t.Status != TaskFlow.Domain.Enums.TaskStatus.Completed);
        var count = query.Count();
        query = search.Sort switch
        {
            TaskSort.DueAscending => query.OrderBy(t => t.DueDate == null).ThenBy(t => t.DueDate)
                .ThenBy(t => t.CreatedAt).ThenBy(t => t.Id),
            TaskSort.DueDescending => query.OrderBy(t => t.DueDate == null).ThenByDescending(t => t.DueDate)
                .ThenByDescending(t => t.CreatedAt).ThenByDescending(t => t.Id),
            TaskSort.PriorityDescending => query.OrderByDescending(t => t.Priority)
                .ThenByDescending(t => t.CreatedAt).ThenByDescending(t => t.Id),
            _ => query.OrderByDescending(t => t.CreatedAt).ThenByDescending(t => t.Id)
        };
        return Task.FromResult(new PagedResult<TaskItem>(
            query.Skip((search.Page - 1) * search.PageSize).Take(search.PageSize).ToArray(), count));
    }

    public Task<TaskDueSummary> GetDueSummaryAsync(DateTime start, DateTime tomorrow,
        DateTime afterNextWeek)
    {
        var active = Items.Where(item => item.Status != TaskFlow.Domain.Enums.TaskStatus.Completed &&
            item.DueDate.HasValue).ToArray();
        return Task.FromResult(new TaskDueSummary(
            active.Count(item => item.DueDate < start),
            active.Count(item => item.DueDate >= start && item.DueDate < tomorrow),
            active.Count(item => item.DueDate >= tomorrow && item.DueDate < afterNextWeek)));
    }

    public Task<TaskItem?> GetByIdAsync(Guid id)
    {
        var task = Items.FirstOrDefault(item => item.Id == id);
        if (task is not null) EnsureVersion(task);
        return Task.FromResult(task);
    }

    public Task AddAsync(TaskItem task)
    {
        EnsureVersion(task);
        Items.Add(task);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(TaskItem task)
    {
        UpdateCount++;
        VersionProperty.SetValue(task, BitConverter.GetBytes(_nextVersion++));
        return Task.CompletedTask;
    }

    public Task DeleteAsync(TaskItem task)
    {
        Items.Remove(task);
        return Task.CompletedTask;
    }
}

internal sealed class FakeSubtaskRepository : ISubtaskRepository
{
    private readonly FakeTaskRepository? _tasks;

    public FakeSubtaskRepository(FakeTaskRepository? tasks = null) => _tasks = tasks;

    public List<SubtaskItem> Items { get; } = [];

    public Task<IReadOnlyList<SubtaskItem>> GetByTaskIdAsync(Guid taskId) =>
        Task.FromResult<IReadOnlyList<SubtaskItem>>(Items.Where(s => s.TaskId == taskId)
            .OrderBy(s => s.CreatedAt).ThenBy(s => s.Id).ToArray());

    public Task<SubtaskItem?> GetByIdAsync(Guid taskId, Guid id) =>
        Task.FromResult(Items.FirstOrDefault(s => s.TaskId == taskId && s.Id == id));

    public Task AddAsync(SubtaskItem subtask)
    {
        Items.Add(subtask);
        _tasks?.AdvanceVersion(subtask.TaskId);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(SubtaskItem subtask)
    {
        _tasks?.AdvanceVersion(subtask.TaskId);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(SubtaskItem subtask)
    {
        Items.Remove(subtask);
        _tasks?.AdvanceVersion(subtask.TaskId);
        return Task.CompletedTask;
    }
}

internal sealed class FakeUserRepository : IUserRepository
{
    public List<User> Items { get; } = [];

    public Task<User?> GetByIdAsync(Guid id) =>
        Task.FromResult(Items.FirstOrDefault(user => user.Id == id));

    public Task<PagedResult<User>> SearchAsync(string? query, int page, int pageSize)
    {
        IEnumerable<User> users = Items;
        if (!string.IsNullOrWhiteSpace(query))
            users = users.Where(user => user.Name.Contains(query, StringComparison.OrdinalIgnoreCase)
                || user.Email.Contains(query, StringComparison.OrdinalIgnoreCase));
        var ordered = users.OrderBy(user => user.Name).ThenBy(user => user.Id).ToArray();
        return Task.FromResult(new PagedResult<User>(
            ordered.Skip((page - 1) * pageSize).Take(pageSize).ToArray(), ordered.Length));
    }

    public Task<User?> GetByEmailAsync(string email) =>
        Task.FromResult(Items.FirstOrDefault(user =>
            string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase)));

    public Task AddAsync(User user)
    {
        Items.Add(user);
        return Task.CompletedTask;
    }
}
