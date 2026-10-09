using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Exceptions;

namespace TaskFlow.API;

public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        var status = exception switch
        {
            InvalidRequestException => StatusCodes.Status400BadRequest,
            ResourceNotFoundException => StatusCodes.Status404NotFound,
            ResourceConflictException => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status500InternalServerError
        };

        if (status == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Falha inesperada ao processar a requisição.");

        var problem = new ProblemDetails
        {
            Status = status,
            Title = status switch
            {
                StatusCodes.Status400BadRequest => "Requisição inválida",
                StatusCodes.Status404NotFound => "Recurso não encontrado",
                StatusCodes.Status409Conflict => "Conflito",
                _ => "Erro interno"
            },
            Detail = status == StatusCodes.Status500InternalServerError
                ? "Não foi possível processar a requisição."
                : exception.Message
        };

        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }
}
