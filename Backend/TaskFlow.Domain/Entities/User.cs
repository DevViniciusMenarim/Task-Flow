namespace TaskFlow.Domain.Entities;

public class User
{
    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public string Email { get; private set; }

    public ICollection<TaskItem> Tasks { get; private set; }

    private User()
    {
        Name = null!;
        Email = null!;
        Tasks = new List<TaskItem>();
    }

    public User(string initialName, string initialEmail)
    {
        var cleanName = FieldRules.NormalizeRequiredText(initialName, FieldRules.UserNameMaxLength);
        var cleanEmail = FieldRules.NormalizeRequiredText(initialEmail, FieldRules.UserEmailMaxLength);
        if (cleanName is null)
            throw new ArgumentException("O nome deve ter entre 1 e 100 caracteres.", nameof(initialName));
        if (cleanEmail is null || !FieldRules.IsValidEmail(cleanEmail))
            throw new ArgumentException("Informe um email válido com até 150 caracteres.", nameof(initialEmail));
        Id = Guid.NewGuid();
        Name = cleanName;
        Email = cleanEmail;
        Tasks = new List<TaskItem>();
    }
}
