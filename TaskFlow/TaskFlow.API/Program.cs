using Microsoft.EntityFrameworkCore;
using TaskFlow.Infrastructure.Context;
// Adicione os usings abaixo:
using TaskFlow.Application.Interfaces;
using TaskFlow.Application.Services;
using TaskFlow.Domain.Interfaces;
using TaskFlow.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// --- INJEÇÃO DE DEPENDÊNCIA (A Mágica) ---
// Quando alguém pedir ITaskRepository, entregue o TaskRepository
builder.Services.AddScoped<ITaskRepository, TaskRepository>();

// Quando alguém pedir ITaskService, entregue o TaskService
builder.Services.AddScoped<ITaskService, TaskService>();
// -----------------------------------------

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();