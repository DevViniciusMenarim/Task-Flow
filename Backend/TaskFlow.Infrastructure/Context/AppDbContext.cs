using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain;

namespace TaskFlow.Infrastructure.Context;

public class AppDbContext : DbContext
{
    // SQL Server datetime2 does not retain DateTime.Kind. All stored values are UTC.
    private static readonly ValueConverter<DateTime, DateTime> UtcDateTimeConverter = new(
        value => value.Kind == DateTimeKind.Local
            ? value.ToUniversalTime()
            : DateTime.SpecifyKind(value, DateTimeKind.Utc),
        value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<TaskItem> Tasks { get; set; }
    public DbSet<SubtaskItem> Subtasks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);

            entity.Property(u => u.Name)
                .IsRequired()
                .HasMaxLength(FieldRules.UserNameMaxLength);

            entity.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(FieldRules.UserEmailMaxLength)
                .UseCollation("Latin1_General_100_CI_AS");

            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => new { u.Name, u.Id });
        });

        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.HasKey(t => t.Id);

            entity.Property(t => t.Title)
                .IsRequired()
                .HasMaxLength(FieldRules.TaskTitleMaxLength);

            entity.Property(t => t.Description)
                .HasMaxLength(FieldRules.TaskDescriptionMaxLength);

            entity.Property(t => t.CreatedAt)
                .HasConversion(UtcDateTimeConverter);

            entity.Property(t => t.DueDate)
                .HasConversion(UtcDateTimeConverter);

            entity.Property(t => t.Priority)
                .HasDefaultValue(TaskFlow.Domain.Enums.TaskPriority.Normal)
                .HasSentinel((TaskFlow.Domain.Enums.TaskPriority)(-1));

            entity.Property(t => t.RowVersion)
                .IsRowVersion();

            entity.HasIndex(t => new { t.Status, t.DueDate, t.Id });

            entity.HasOne(t => t.User)
                .WithMany(u => u.Tasks)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SubtaskItem>(entity =>
        {
            entity.HasKey(s => s.Id);

            entity.Property(s => s.Title)
                .IsRequired()
                .HasMaxLength(FieldRules.SubtaskTitleMaxLength);

            entity.Property(s => s.CreatedAt)
                .HasConversion(UtcDateTimeConverter);

            entity.HasOne(s => s.Task)
                .WithMany()
                .HasForeignKey(s => s.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(s => new { s.TaskId, s.CreatedAt, s.Id });
        });
    }
}
