using Microsoft.EntityFrameworkCore;
using TaskFlow.API;
using TaskFlow.Infrastructure.Context;
using TaskFlow.Application.Interfaces;
using TaskFlow.Application.Services;
using TaskFlow.Domain.Interfaces;
using TaskFlow.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("Configure ConnectionStrings:DefaultConnection antes de iniciar a API.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddScoped<ITaskRepository, TaskRepository>();
builder.Services.AddScoped<ISubtaskRepository, SubtaskRepository>();

builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<ISubtaskService, SubtaskService>();

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();

var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.MapGet("/health", async (AppDbContext db, CancellationToken cancellationToken) =>
{
    try
    {
        return await db.Database.CanConnectAsync(cancellationToken)
            ? Results.Ok()
            : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
    catch (Exception)
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
});
app.MapControllers();

app.Run();
