using System.Net;
using System.Net.Http.Json;
using System.Reflection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection;
using TaskFlow.API.Controllers;
using TaskFlow.Application.Interfaces;

namespace TaskFlow.Tests;

public sealed class RecordValidationHttpTests
{
    [Fact]
    public async Task Invalid_positional_record_inputs_return_400_from_http_endpoints()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, 0));
        builder.Services.AddControllers().AddApplicationPart(typeof(UsersController).Assembly);
        builder.Services.AddSingleton(DispatchProxy.Create<IUserService, UncalledServiceProxy>());
        builder.Services.AddSingleton(DispatchProxy.Create<ITaskService, UncalledServiceProxy>());
        builder.Services.AddSingleton(DispatchProxy.Create<ISubtaskService, UncalledServiceProxy>());

        await using var app = builder.Build();
        app.MapControllers();
        await app.StartAsync();

        var address = app.Services.GetRequiredService<IServer>()
            .Features.Get<IServerAddressesFeature>()!.Addresses.Single();
        using var client = new HttpClient { BaseAddress = new Uri(address) };
        var taskId = Guid.NewGuid();

        var cases = new (string Name, HttpMethod Method, string Path, object Payload, string Field)[]
        {
            ("user", HttpMethod.Post, "/api/Users",
                new { Name = "Maria", Email = "invalid-email" }, "Email"),
            ("task create", HttpMethod.Post, "/api/Tasks",
                new { Title = new string('x', 201), Description = "Descrição", UserId = Guid.NewGuid(),
                    DueDate = (DateTime?)null }, "Title"),
            ("task update", HttpMethod.Put, $"/api/Tasks/{taskId}",
                new { Title = "Título", Description = new string('x', 1001),
                    DueDate = (DateTime?)null }, "Description"),
            ("subtask", HttpMethod.Post, $"/api/Tasks/{taskId}/subtasks",
                new { Title = new string('x', 201) }, "Title")
        };

        foreach (var testCase in cases)
        {
            using var request = new HttpRequestMessage(testCase.Method, testCase.Path)
            {
                Content = JsonContent.Create(testCase.Payload)
            };
            using var response = await client.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            Assert.True(response.StatusCode == HttpStatusCode.BadRequest,
                $"{testCase.Name}: expected 400, got {(int)response.StatusCode}: {body}");
            Assert.Contains(testCase.Field, body, StringComparison.OrdinalIgnoreCase);
        }

        await app.StopAsync();
    }

    public class UncalledServiceProxy : DispatchProxy
    {
        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args) =>
            throw new InvalidOperationException("Validation should reject the request before calling a service.");
    }
}