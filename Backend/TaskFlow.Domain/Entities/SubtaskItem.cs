namespace TaskFlow.Domain.Entities;

public class SubtaskItem
{
    public Guid Id { get; private set; }
    public Guid TaskId { get; private set; }
    public TaskItem? Task { get; private set; }
    public string Title { get; private set; }
    public bool IsCompleted { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private SubtaskItem()
    {
        Title = null!;
    }

    public SubtaskItem(Guid parentTaskId, string initialTitle)
    {
        if (parentTaskId == Guid.Empty)
            throw new ArgumentException("A tarefa da subtarefa é obrigatória.", nameof(parentTaskId));
        Id = Guid.NewGuid();
        TaskId = parentTaskId;
        Title = ValidateTitle(initialTitle);
        CreatedAt = DateTime.UtcNow;
    }

    public void Update(string? title, bool? isCompleted)
    {
        if (title is not null) Title = ValidateTitle(title);
        if (isCompleted.HasValue) IsCompleted = isCompleted.Value;
    }

    private static string ValidateTitle(string title)
    {
        var cleaned = FieldRules.NormalizeRequiredText(title, FieldRules.SubtaskTitleMaxLength);
        if (cleaned is null)
            throw new ArgumentException("O título da subtarefa deve ter entre 1 e 200 caracteres.", nameof(title));
        return cleaned;
    }
}
