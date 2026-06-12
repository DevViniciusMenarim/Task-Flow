using TaskFlow.Domain.Enums;

namespace TaskFlow.Domain.Entities;

public class TaskItem
{
    public Guid Id { get; private set; }
    public string Title { get; private set; }
    public string Description { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? DueDate { get; private set; }
    public Enums.TaskStatus Status { get; private set; }

    // Chave estrangeira e propriedade de navegação para o Usuário
    public Guid UserId { get; private set; }
    public User User { get; private set; }

    public TaskItem(string title, string description, Guid userId, DateTime? dueDate = null)
    {
        Id = Guid.NewGuid();
        Title = title;
        Description = description;
        CreatedAt = DateTime.UtcNow; // Sempre salve datas em UTC em sistemas escaláveis
        DueDate = dueDate;
        Status = Enums.TaskStatus.Pending; // Toda tarefa nasce como pendente
        UserId = userId;
    }

    // Método focado em alterar o status (Regra de Negócio encapsulada)
    public void UpdateStatus(Enums.TaskStatus newStatus)
    {
        Status = newStatus;
    }
}