using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.DTOs;

// O que o usuário envia para CRIAR uma tarefa (não precisamos pedir o Status nem o Id)
public record CreateTaskDTO(string Title, string Description, Guid UserId, DateTime? DueDate);

// O que o usuário envia para ATUALIZAR uma tarefa
public record UpdateTaskDTO(string Title, string Description, DateTime? DueDate);

// O que a API DEVOLVE para o usuário (escondemos dados sensíveis, se houvesse)
public record TaskResponseDTO(Guid Id, string Title, string Description, DateTime CreatedAt, DateTime? DueDate, TaskFlow.Domain.Enums.TaskStatus Status);