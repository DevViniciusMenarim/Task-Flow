using System.Security.Cryptography;
using TaskFlow.Application.Exceptions;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Application.Services;

internal static class TaskVersion
{
    public static void EnsureMatches(TaskItem task, string? ifMatch)
    {
        var value = ifMatch?.Trim();
        if (value is null || value.Length < 3 || value[0] != '"' || value[^1] != '"')
            throw new ResourceConflictException("Atualize a tarefa antes de salvar: versão ausente ou inválida.");

        var token = value[1..^1];
        byte[] expected;
        try
        {
            expected = Convert.FromBase64String(token);
        }
        catch (FormatException)
        {
            throw new ResourceConflictException("Atualize a tarefa antes de salvar: versão inválida.");
        }

        if (expected.Length != 8 || Convert.ToBase64String(expected) != token ||
            task.RowVersion.Length != 8 || !CryptographicOperations.FixedTimeEquals(expected, task.RowVersion))
            throw new ResourceConflictException("A tarefa foi alterada por outra requisição. Recarregue antes de salvar.");
    }
}
