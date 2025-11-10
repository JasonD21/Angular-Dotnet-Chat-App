using System;

namespace backend.DTOs;

public class OnlineUserDto
{
    public string? Id { get; set; }
    public string? ConnectionId { get; set; }
    public string? UserName { get; set; }
    public string? FullName { get; set; }
    public string? ProfileImageUrl { get; set; }
    public bool? IsOnline { get; set; }
    public int UnreadCount { get; set; }

}
