using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Exceptions;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Interfaces;
using TaskFlow.Domain.Enums;
using TaskFlow.Domain.Queries;
using TaskFlow.Infrastructure.Context;

namespace TaskFlow.Infrastructure.Repositories;

public class TaskRepository : ITaskRepository
{
    private readonly AppDbContext _context;

    public TaskRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<TaskItem?> GetByIdAsync(Guid id)
    {
        return await _context.Tasks.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task AddAsync(TaskItem task)
    {
        await _context.Tasks.AddAsync(task);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 547 })
        {
            throw new ResourceNotFoundException("Usuário não encontrado.");
        }
    }

    public async Task<PagedResult<TaskItem>> SearchAsync(TaskSearch search)
    {
        IQueryable<TaskItem> query = _context.Tasks.AsNoTracking().Include(t => t.User);
        if (!string.IsNullOrWhiteSpace(search.Query))
        {
            var text = search.Query;
            query = query.Where(t => t.Title.Contains(text) || t.Description.Contains(text));
        }
        if (search.Status.HasValue)
            query = query.Where(t => t.Status == search.Status.Value);
        if (search.UserId.HasValue)
            query = query.Where(t => t.UserId == search.UserId.Value);
        if (search.Priority.HasValue)
            query = query.Where(t => t.Priority == search.Priority.Value);
        if (search.DueFrom.HasValue)
            query = query.Where(t => t.DueDate >= search.DueFrom.Value);
        if (search.DueBefore.HasValue)
            query = query.Where(t => t.DueDate < search.DueBefore.Value);
        if (search.ActiveOnly)
            query = query.Where(t => t.Status != Domain.Enums.TaskStatus.Completed);

        var totalCount = await query.CountAsync();
        query = search.Sort switch
        {
            TaskSort.DueAscending => query.OrderBy(t => t.DueDate == null)
                .ThenBy(t => t.DueDate).ThenBy(t => t.CreatedAt).ThenBy(t => t.Id),
            TaskSort.DueDescending => query.OrderBy(t => t.DueDate == null)
                .ThenByDescending(t => t.DueDate).ThenByDescending(t => t.CreatedAt)
                .ThenByDescending(t => t.Id),
            TaskSort.PriorityDescending => query.OrderByDescending(t => t.Priority)
                .ThenByDescending(t => t.CreatedAt).ThenByDescending(t => t.Id),
            _ => query.OrderByDescending(t => t.CreatedAt).ThenByDescending(t => t.Id)
        };
        var items = await query.Skip((search.Page - 1) * search.PageSize)
            .Take(search.PageSize).ToListAsync();
        return new PagedResult<TaskItem>(items, totalCount);
    }

    public async Task<TaskDueSummary> GetDueSummaryAsync(
        DateTime start, DateTime tomorrow, DateTime afterNextWeek)
    {
        var counts = await _context.Tasks.AsNoTracking()
            .Where(t => t.Status != Domain.Enums.TaskStatus.Completed &&
                t.DueDate.HasValue && t.DueDate < afterNextWeek)
            .GroupBy(_ => 1)
            .Select(group => new TaskDueSummary(
                group.Count(t => t.DueDate < start),
                group.Count(t => t.DueDate >= start && t.DueDate < tomorrow),
                group.Count(t => t.DueDate >= tomorrow)))
            .SingleOrDefaultAsync();
        return counts ?? new TaskDueSummary(0, 0, 0);
    }

    public async Task UpdateAsync(TaskItem task)
    {
        if (_context.Entry(task).State == EntityState.Detached)
            throw new InvalidOperationException("A tarefa deve estar rastreada antes da atualização.");
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ResourceConflictException("A tarefa foi alterada por outra requisição. Recarregue antes de salvar.");
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 547 })
        {
            throw new ResourceNotFoundException("Usuário não encontrado.");
        }
    }

    public async Task DeleteAsync(TaskItem task)
    {
        _context.Tasks.Remove(task);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ResourceConflictException("A tarefa foi alterada por outra requisição. Recarregue antes de excluir.");
        }
    }
}
