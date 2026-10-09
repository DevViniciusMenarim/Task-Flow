using TaskFlow.Application.DTOs;
using TaskFlow.Application.Exceptions;
using TaskFlow.Application.Interfaces;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Interfaces;
using TaskFlow.Domain;

namespace TaskFlow.Application.Services;

public sealed class SubtaskService(ITaskRepository tasks, ISubtaskRepository subtasks) : ISubtaskService
{
    public async Task<IReadOnlyList<SubtaskResponseDTO>> GetByTaskIdAsync(Guid taskId)
    {
        await EnsureTaskExists(taskId);
        var items = await subtasks.GetByTaskIdAsync(taskId);
        return items.Select(ToResponse).ToArray();
    }

    public async Task<SubtaskResponseDTO> CreateAsync(Guid taskId, CreateSubtaskDTO dto, string? ifMatch)
    {
        var title = ValidateTitle(dto.Title);
        await EnsureTaskVersion(taskId, ifMatch);
        var subtask = new SubtaskItem(taskId, title);
        await subtasks.AddAsync(subtask);
        return ToResponse(subtask);
    }

    public async Task<SubtaskResponseDTO> UpdateAsync(Guid taskId, Guid subtaskId, UpdateSubtaskDTO dto, string? ifMatch)
    {
        if (dto.Title is null && dto.IsCompleted is null)
            throw new InvalidRequestException("Informe ao menos um campo para alterar.");
        var title = dto.Title is null ? null : ValidateTitle(dto.Title);
        await EnsureTaskVersion(taskId, ifMatch);
        var subtask = await subtasks.GetByIdAsync(taskId, subtaskId)
            ?? throw new ResourceNotFoundException("Subtarefa não encontrada.");
        subtask.Update(title, dto.IsCompleted);
        await subtasks.UpdateAsync(subtask);
        return ToResponse(subtask);
    }

    public async Task DeleteAsync(Guid taskId, Guid subtaskId, string? ifMatch)
    {
        await EnsureTaskVersion(taskId, ifMatch);
        var subtask = await subtasks.GetByIdAsync(taskId, subtaskId)
            ?? throw new ResourceNotFoundException("Subtarefa não encontrada.");
        await subtasks.DeleteAsync(subtask);
    }

    private async Task EnsureTaskVersion(Guid taskId, string? ifMatch)
    {
        var task = await tasks.GetByIdAsync(taskId)
            ?? throw new ResourceNotFoundException("Tarefa não encontrada.");
        TaskVersion.EnsureMatches(task, ifMatch);
    }

    private async Task EnsureTaskExists(Guid taskId)
    {
        if (await tasks.GetByIdAsync(taskId) is null)
            throw new ResourceNotFoundException("Tarefa não encontrada.");
    }

    private static string ValidateTitle(string? title)
    {
        var cleaned = FieldRules.NormalizeRequiredText(title, FieldRules.SubtaskTitleMaxLength);
        if (cleaned is null)
            throw new InvalidRequestException("O título da subtarefa deve ter entre 1 e 200 caracteres.");
        return cleaned;
    }

    private static SubtaskResponseDTO ToResponse(SubtaskItem subtask) =>
        new(subtask.Id, subtask.TaskId, subtask.Title, subtask.IsCompleted,
            subtask.CreatedAt);
}
