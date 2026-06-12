using TaskFlow.Application.DTOs;
using TaskFlow.Application.Interfaces;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Interfaces;

namespace TaskFlow.Application.Services;

public class TaskService : ITaskService
{
    private readonly ITaskRepository _repository;

    // Injeção de Dependência: O serviço pede o repositório, mas não sabe que é o SQL Server!
    public TaskService(ITaskRepository repository)
    {
        _repository = repository;
    }

    public async Task<TaskResponseDTO> CreateAsync(CreateTaskDTO dto)
    {
        // 1. Converte o DTO para a Entidade do Domínio
        var task = new TaskItem(dto.Title, dto.Description, dto.UserId, dto.DueDate);

        // 2. Salva no banco de dados via Repositório
        await _repository.AddAsync(task);

        // 3. Converte de volta para DTO para mostrar ao usuário
        return new TaskResponseDTO(task.Id, task.Title, task.Description, task.CreatedAt, task.DueDate, task.Status);
    }

    public async Task<IEnumerable<TaskResponseDTO>> GetAllAsync()
    {
        var tasks = await _repository.GetAllAsync();
        
        // Mapeia a lista de Entidades para uma lista de DTOs
        return tasks.Select(t => new TaskResponseDTO(t.Id, t.Title, t.Description, t.CreatedAt, t.DueDate, t.Status));
    }

    public async Task<TaskResponseDTO?> GetByIdAsync(Guid id)
    {
        var task = await _repository.GetByIdAsync(id);
        if (task == null) return null;

        return new TaskResponseDTO(task.Id, task.Title, task.Description, task.CreatedAt, task.DueDate, task.Status);
    }

    public async Task UpdateAsync(Guid id, UpdateTaskDTO dto)
    {
        var task = await _repository.GetByIdAsync(id);
        if (task == null) throw new Exception("Tarefa não encontrada."); // Em um cenário real, usaríamos uma Custom Exception

        // Aqui teríamos métodos na Entidade para atualizar os dados (encapsulamento), 
        // mas para simplificar vamos apenas ilustrar a chamada de atualização.
        // Como o EF Core rastreia o objeto, a atualização ocorreria aqui.
        
        await _repository.UpdateAsync(task);
    }

    public async Task DeleteAsync(Guid id)
    {
        var task = await _repository.GetByIdAsync(id);
        if (task != null)
        {
            await _repository.DeleteAsync(task);
        }
    }

    public async Task UpdateStatusAsync(Guid id, Domain.Enums.TaskStatus newStatus)
    {
        var task = await _repository.GetByIdAsync(id);
        if (task == null) throw new Exception("Tarefa não encontrada.");

        // Usa o método encapsulado que criamos lá na primeira etapa!
        task.UpdateStatus(newStatus); 

        await _repository.UpdateAsync(task);
    }
}