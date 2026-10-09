using TaskFlow.Domain.Enums;

namespace TaskFlow.Domain.Entities;

public class TaskItem
{
    public Guid Id { get; private set; }
    public string Title { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; }
    public DateTime? DueDate { get; private set; }
    public Enums.TaskStatus Status { get; private set; }
    public TaskPriority Priority { get; private set; }
    public byte[] RowVersion { get; private set; } = Array.Empty<byte>();

    public Guid UserId { get; private set; }
    // The navigation is null when a task is queried without Include(t => t.User).
    public User? User { get; private set; }

    // EF uses this constructor to materialize rows. Business rules apply to new changes.
    private TaskItem() { }

    public TaskItem(string initialTitle, string initialDescription, Guid assigneeId,
        DateTime? initialDueDate = null, TaskPriority initialPriority = TaskPriority.Normal)
    {
        if (assigneeId == Guid.Empty)
            throw new ArgumentException("O usuário da tarefa é obrigatório.", nameof(assigneeId));
        if (!Enum.IsDefined(initialPriority))
            throw new ArgumentOutOfRangeException(nameof(initialPriority));
        Id = Guid.NewGuid();
        UpdateDetails(initialTitle, initialDescription, initialDueDate);
        CreatedAt = DateTime.UtcNow;
        Status = Enums.TaskStatus.Pending;
        Priority = initialPriority;
        UserId = assigneeId;
    }

    public void UpdateStatus(Enums.TaskStatus newStatus)
    {
        if (!Enum.IsDefined(newStatus))
            throw new ArgumentOutOfRangeException(nameof(newStatus));
        Status = newStatus;
    }

    public void UpdateDetails(string title, string description, DateTime? dueDate)
    {
        var cleanTitle = FieldRules.NormalizeRequiredText(title, FieldRules.TaskTitleMaxLength);
        var cleanDescription = FieldRules.NormalizeRequiredText(description, FieldRules.TaskDescriptionMaxLength);
        if (cleanTitle is null)
            throw new ArgumentException("O título deve ter entre 1 e 200 caracteres.", nameof(title));
        if (cleanDescription is null)
            throw new ArgumentException("A descrição deve ter entre 1 e 1000 caracteres.", nameof(description));
        if (dueDate is { Kind: DateTimeKind.Unspecified })
            throw new ArgumentException("O prazo deve incluir um fuso horário.", nameof(dueDate));
        Title = cleanTitle;
        Description = cleanDescription;
        DueDate = dueDate?.ToUniversalTime();
    }

    public void Reassign(Guid userId)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("O usuário da tarefa é obrigatório.", nameof(userId));
        UserId = userId;
    }

    public void UpdatePriority(TaskPriority priority)
    {
        if (!Enum.IsDefined(priority))
            throw new ArgumentOutOfRangeException(nameof(priority));
        Priority = priority;
    }
}
