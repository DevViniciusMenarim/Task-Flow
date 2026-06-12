using Microsoft.EntityFrameworkCore;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Infrastructure.Context;

public class AppDbContext : DbContext
{
    // O construtor recebe as opções (como a string de conexão) da camada de API
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // Estas propriedades representam as suas tabelas no banco de dados
    public DbSet<User> Users { get; set; }
    public DbSet<TaskItem> Tasks { get; set; }

    // É aqui que usamos a Fluent API para configurar as tabelas sem "sujar" as Entidades
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configuração da Tabela User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id); // Define a Chave Primária
            
            entity.Property(u => u.Name)
                  .IsRequired()
                  .HasMaxLength(100); // Varchar(100) e Not Null
                  
            entity.Property(u => u.Email)
                  .IsRequired()
                  .HasMaxLength(150);

            // Garante que não teremos dois usuários com o mesmo email
            entity.HasIndex(u => u.Email).IsUnique(); 
        });

        // Configuração da Tabela TaskItem
        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.HasKey(t => t.Id);

            entity.Property(t => t.Title)
                  .IsRequired()
                  .HasMaxLength(200);

            entity.Property(t => t.Description)
                  .HasMaxLength(1000);

            // Configurando o relacionamento: 1 Usuário tem Muitas Tarefas
            entity.HasOne(t => t.User)
                  .WithMany(u => u.Tasks)
                  .HasForeignKey(t => t.UserId)
                  .OnDelete(DeleteBehavior.Cascade); // Se deletar o usuário, deleta as tarefas dele
        });
    }
}