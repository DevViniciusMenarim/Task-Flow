using TaskFlow.Application.DTOs;
using TaskFlow.Application.Exceptions;
using TaskFlow.Application.Interfaces;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Interfaces;
using TaskFlow.Domain.Queries;
using TaskFlow.Domain.Enums;
using TaskFlow.Domain;

namespace TaskFlow.Application.Services;

public class TaskService : ITaskService
{
    private readonly ITaskRepository _repository;
    private readonly IUserRepository _users;

    public TaskService(ITaskRepository repository, IUserRepository users)
    {
        _repository = repository;
        _users = users;
    }

    public async Task<TaskResponseDTO> CreateAsync(CreateTaskDTO dto)
    {
        var (title, description, dueDate) = ValidateDetails(dto.Title, dto.Description, dto.DueDate);
        var priority = ValidatePriority(dto.Priority ?? TaskPriority.Normal);
        if (dto.UserId == Guid.Empty)
            throw new InvalidRequestException("Selecione um usuário válido.");

        var user = await _users.GetByIdAsync(dto.UserId)
            ?? throw new ResourceNotFoundException("Usuário não encontrado.");

        var task = new TaskItem(title, description, dto.UserId, dueDate, priority);

        await _repository.AddAsync(task);

        return ToResponse(task, user.Name);
    }

    public async Task<PagedTasksDTO> SearchAsync(TaskSearchDTO search)
    {
        var query = search.Q?.Trim();
        if (query?.Length > 200)
            throw new InvalidRequestException("A busca deve ter no máximo 200 caracteres.");
        if (search.Status is { } status && !Enum.IsDefined(status))
            throw new InvalidRequestException("Status inválido.");
        if (search.Priority is { } priority)
            ValidatePriority(priority);
        if (search.UserId == Guid.Empty)
            throw new InvalidRequestException("Usuário inválido.");
        if (search.Page < 1 || search.PageSize is < 1 or > 100 ||
            (long)(search.Page - 1) * search.PageSize > int.MaxValue)
            throw new InvalidRequestException("Página ou tamanho de página inválido.");
        var sort = search.Sort switch
        {
            "createdDesc" => TaskSort.CreatedDescending,
            "dueAsc" => TaskSort.DueAscending,
            "dueDesc" => TaskSort.DueDescending,
            "priorityDesc" => TaskSort.PriorityDescending,
            _ => throw new InvalidRequestException("Ordenação inválida.")
        };

        var dueFrom = NormalizeSearchDate(search.DueFrom);
        var dueBefore = NormalizeSearchDate(search.DueBefore);
        if (dueFrom.HasValue && dueBefore.HasValue && dueBefore <= dueFrom)
            throw new InvalidRequestException("O limite final do prazo deve ser posterior ao inicial.");

        var result = await _repository.SearchAsync(new TaskSearch(query, search.Status,
            search.UserId, search.Priority, dueFrom, dueBefore, search.ActiveOnly,
            search.Page, search.PageSize, sort));
        var totalPages = (int)Math.Ceiling((double)result.TotalCount / search.PageSize);
        return new PagedTasksDTO(result.Items.Select(task => ToResponse(task)).ToArray(), search.Page,
            search.PageSize, result.TotalCount, totalPages);
    }

    public async Task<TaskDueSummaryDTO> GetDueSummaryAsync(
        DateTime? start, DateTime? tomorrow, DateTime? afterNextWeek)
    {
        if (start is not { Kind: DateTimeKind.Utc } ||
            tomorrow is not { Kind: DateTimeKind.Utc } ||
            afterNextWeek is not { Kind: DateTimeKind.Utc } ||
            tomorrow <= start || afterNextWeek <= tomorrow ||
            tomorrow - start > TimeSpan.FromHours(26) ||
            afterNextWeek - tomorrow > TimeSpan.FromDays(8))
            throw new InvalidRequestException("Informe limites de dias válidos em UTC.");

        var summary = await _repository.GetDueSummaryAsync(
            start.Value, tomorrow.Value, afterNextWeek.Value);
        return new TaskDueSummaryDTO(summary.Overdue, summary.Today, summary.Week);
    }

    public async Task<TaskResponseDTO?> GetByIdAsync(Guid id)
    {
        var task = await _repository.GetByIdAsync(id);
        if (task == null) return null;

        return ToResponse(task);
    }

    public async Task UpdateAsync(Guid id, UpdateTaskDTO dto, string? ifMatch = null)
    {
        var (title, description, dueDate) = ValidateDetails(dto.Title, dto.Description, dto.DueDate);
        var priority = dto.Priority.HasValue ? ValidatePriority(dto.Priority.Value) : (TaskPriority?)null;
        var task = await _repository.GetByIdAsync(id);
        if (task == null) throw new ResourceNotFoundException("Tarefa não encontrada.");
        TaskVersion.EnsureMatches(task, ifMatch);

        if (dto.UserId.HasValue)
        {
            if (dto.UserId == Guid.Empty)
                throw new InvalidRequestException("Usuário inválido.");
            if (await _users.GetByIdAsync(dto.UserId.Value) is null)
                throw new ResourceNotFoundException("Usuário não encontrado.");
            task.Reassign(dto.UserId.Value);
        }
        if (priority.HasValue)
            task.UpdatePriority(priority.Value);

        task.UpdateDetails(title, description, dueDate);
        await _repository.UpdateAsync(task);
    }

    public async Task DeleteAsync(Guid id, string? ifMatch = null)
    {
        var task = await _repository.GetByIdAsync(id);
        if (task != null)
        {
            TaskVersion.EnsureMatches(task, ifMatch);
            await _repository.DeleteAsync(task);
        }
    }

    public async Task UpdateStatusAsync(Guid id, Domain.Enums.TaskStatus newStatus, string? ifMatch = null)
    {
        if (!Enum.IsDefined(newStatus))
            throw new InvalidRequestException("Status inválido.");

        var task = await _repository.GetByIdAsync(id);
        if (task == null) throw new ResourceNotFoundException("Tarefa não encontrada.");
        TaskVersion.EnsureMatches(task, ifMatch);

        task.UpdateStatus(newStatus);

        await _repository.UpdateAsync(task);
    }

    private static (string Title, string Description, DateTime? DueDate) ValidateDetails(
        string title, string description, DateTime? dueDate)
    {
        var cleanTitle = FieldRules.NormalizeRequiredText(title, FieldRules.TaskTitleMaxLength);
        var cleanDescription = FieldRules.NormalizeRequiredText(description, FieldRules.TaskDescriptionMaxLength);

        if (cleanTitle is null)
            throw new InvalidRequestException("O título deve ter entre 1 e 200 caracteres.");

        if (cleanDescription is null)
            throw new InvalidRequestException("A descrição deve ter entre 1 e 1000 caracteres.");

        if (dueDate is { Kind: DateTimeKind.Unspecified })
            throw new InvalidRequestException("O prazo deve incluir um fuso horário.");

        return (cleanTitle, cleanDescription, dueDate?.ToUniversalTime());
    }

    private static TaskPriority ValidatePriority(TaskPriority priority)
    {
        if (!Enum.IsDefined(priority))
            throw new InvalidRequestException("Prioridade inválida.");
        return priority;
    }

    private static DateTime? NormalizeSearchDate(DateTime? date)
    {
        if (date is { Kind: DateTimeKind.Unspecified })
            throw new InvalidRequestException("O filtro de prazo deve incluir um fuso horário.");
        return date?.ToUniversalTime();
    }

    private static TaskResponseDTO ToResponse(TaskItem task, string? userName = null) =>
        new(task.Id, task.Title, task.Description, task.CreatedAt, task.DueDate,
            task.Status, task.UserId, task.Priority, userName ?? task.User?.Name ?? string.Empty,
            Convert.ToBase64String(task.RowVersion));
}
