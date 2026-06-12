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

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tasks = await _taskService.GetAllAsync();
        return Ok(tasks); // Retorna 200 OK
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var task = await _taskService.GetByIdAsync(id);
        if (task == null) return NotFound(); // Retorna 404 Not Found

        return Ok(task);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTaskDTO dto)
    {
        try
        {
            await _taskService.UpdateAsync(id, dto);
            return NoContent(); // Retorna 204 No Content (Atualizou com sucesso, mas não tem o que devolver)
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message }); // Retorna 400 Bad Request
        }
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] Domain.Enums.TaskStatus newStatus)
    {
        try
        {
            await _taskService.UpdateStatusAsync(id, newStatus);
            return NoContent();
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _taskService.DeleteAsync(id);
        return NoContent();
    }
}