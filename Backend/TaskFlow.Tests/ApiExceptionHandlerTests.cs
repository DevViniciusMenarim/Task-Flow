using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using TaskFlow.API;
using TaskFlow.Application.Exceptions;

namespace TaskFlow.Tests;

public sealed class ApiExceptionHandlerTests
{
    [Fact]
    public async Task Known_request_errors_map_to_400_404_and_409()
    {
        Assert.Equal(400, (await Handle(new InvalidRequestException("inválido"))).Status);
        Assert.Equal(404, (await Handle(new ResourceNotFoundException("ausente"))).Status);
        Assert.Equal(409, (await Handle(new ResourceConflictException("duplicado"))).Status);
    }

    [Fact]
    public async Task Unexpected_error_returns_500_without_exception_message()
    {
        var response = await Handle(new InvalidOperationException("detalhes internos do banco"));

        Assert.Equal(500, response.Status);
        Assert.DoesNotContain("detalhes internos do banco", response.Body);
        Assert.Contains("Erro interno", response.Body);
    }

    private static async Task<(int Status, string Body)> Handle(Exception exception)
    {
        var context = new DefaultHttpContext
        {
            RequestServices = new ServiceCollection().AddOptions().BuildServiceProvider()
        };
        await using var body = new MemoryStream();
        context.Response.Body = body;
        var handler = new ApiExceptionHandler(NullLogger<ApiExceptionHandler>.Instance);

        await handler.TryHandleAsync(context, exception, CancellationToken.None);
        body.Position = 0;
        using var reader = new StreamReader(body);
        return (context.Response.StatusCode, await reader.ReadToEndAsync());
    }
}
