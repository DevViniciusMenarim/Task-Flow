using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.DTOs;
using TaskFlow.Application.Interfaces;

namespace TaskFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")] // A rota será: localhost:porta/api/tasks
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;

    public TasksController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskDTO dto)
    {
        var result = await _taskService.CreateAsync(dto);
        // Retorna 201 Created e o link para buscar a tarefa recém-criada
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? q,
        [FromQuery] Domain.Enums.TaskStatus? status,
        [FromQuery] Guid? userId,
        [FromQuery] Domain.Enums.TaskPriority? priority,
        [FromQuery] DateTime? dueFrom,
        [FromQuery] DateTime? dueBefore,
        [FromQuery] bool activeOnly = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sort = "createdDesc")
    {
        return Ok(await _taskService.SearchAsync(new TaskSearchDTO(q, status, userId,
            priority, dueFrom, dueBefore, activeOnly, page, pageSize, sort)));
    }

    [HttpGet("due-summary")]
    public async Task<IActionResult> GetDueSummary([FromQuery] DateTime? start,
        [FromQuery] DateTime? tomorrow, [FromQuery] DateTime? afterNextWeek)
    {
        return Ok(await _taskService.GetDueSummaryAsync(start, tomorrow, afterNextWeek));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var task = await _taskService.GetByIdAsync(id);
        if (task == null) return NotFound(); // Retorna 404 Not Found

        return Ok(task);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTaskDTO dto,
        [FromHeader(Name = "If-Match")] string? ifMatch)
    {
        await _taskService.UpdateAsync(id, dto, ifMatch);
        return NoContent();
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] Domain.Enums.TaskStatus newStatus,
        [FromHeader(Name = "If-Match")] string? ifMatch)
    {
        await _taskService.UpdateStatusAsync(id, newStatus, ifMatch);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id,
        [FromHeader(Name = "If-Match")] string? ifMatch)
    {
        await _taskService.DeleteAsync(id, ifMatch);
        return NoContent();
    }
}
