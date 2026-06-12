namespace TaskFlow.Domain.Entities;

public class User
{
    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public string Email { get; private set; }
    
    // Propriedade de navegação: Um usuário pode ter várias tarefas
    public ICollection<TaskItem> Tasks { get; private set; }

    // Construtor para garantir que a entidade nasça em um estado válido
    public User(string name, string email)
    {
        Id = Guid.NewGuid();
        Name = name;
        Email = email;
        Tasks = new List<TaskItem>();
    }
}