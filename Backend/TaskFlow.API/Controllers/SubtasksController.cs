using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.DTOs;
using TaskFlow.Application.Interfaces;

namespace TaskFlow.API.Controllers;

[ApiController]
[Route("api/Tasks/{taskId:guid}/subtasks")]
public sealed class SubtasksController(ISubtaskService subtasks) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SubtaskResponseDTO>>> GetAll(Guid taskId) =>
        Ok(await subtasks.GetByTaskIdAsync(taskId));

    [HttpPost]
    public async Task<ActionResult<SubtaskResponseDTO>> Create(Guid taskId,
        [FromBody] CreateSubtaskDTO dto, [FromHeader(Name = "If-Match")] string? ifMatch)
    {
        var created = await subtasks.CreateAsync(taskId, dto, ifMatch);
        return CreatedAtAction(nameof(GetAll), new { taskId }, created);
    }

    [HttpPatch("{subtaskId:guid}")]
    public async Task<ActionResult<SubtaskResponseDTO>> Update(Guid taskId, Guid subtaskId,
        [FromBody] UpdateSubtaskDTO dto, [FromHeader(Name = "If-Match")] string? ifMatch) =>
        Ok(await subtasks.UpdateAsync(taskId, subtaskId, dto, ifMatch));

    [HttpDelete("{subtaskId:guid}")]
    public async Task<IActionResult> Delete(Guid taskId, Guid subtaskId,
        [FromHeader(Name = "If-Match")] string? ifMatch)
    {
        await subtasks.DeleteAsync(taskId, subtaskId, ifMatch);
        return NoContent();
    }
}
