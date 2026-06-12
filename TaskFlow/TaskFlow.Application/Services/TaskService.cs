using TaskFlow.Application.DTOs;
using TaskFlow.Application.Interfaces;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Interfaces;

namespace TaskFlow.Application.Services;

public class TaskService : ITaskService
{
    private readonly ITaskRepository _repository;

    public TaskService(ITaskRepository repository)
    {
        _repository = repository;
    }

    public async Task<TaskResponseDTO> CreateAsync(CreateTaskDTO dto)
    {
        var task = new TaskItem(dto.Title, dto.Description, dto.UserId, dto.DueDate);

        await _repository.AddAsync(task);

        return new TaskResponseDTO(task.Id, task.Title, task.Description, task.CreatedAt, task.DueDate, task.Status);
    }

    public async Task<IEnumerable<TaskResponseDTO>> GetAllAsync()
    {
        var tasks = await _repository.GetAllAsync();

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
        if (task == null) throw new Exception("Tarefa não encontrada.");

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

        task.UpdateStatus(newStatus);

        await _repository.UpdateAsync(task);
    }
}