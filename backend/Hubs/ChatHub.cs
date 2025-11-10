using System;
using System.Collections.Concurrent;
using backend.Data;
using backend.DTOs;
using backend.Extensions;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace backend.Hubs;

[Authorize]
public class ChatHub(UserManager<AppUser> userManager, AppDbContext context) : Hub
{
    public static readonly ConcurrentDictionary<string, OnlineUserDto> onlineUsers = new();

    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        var receiverId = httpContext?.Request.Query["senderId"].ToString();
        var userName = Context.User!.Identity!.Name!;
        var currentUser = await userManager.FindByNameAsync(userName);
        var ConnectionId = Context.ConnectionId;

        if (onlineUsers.ContainsKey(userName))
        {
            onlineUsers[userName].ConnectionId = ConnectionId;
        }
        else
        {
            var user = new OnlineUserDto
            {
                ConnectionId = ConnectionId,
                UserName = userName,
                ProfileImageUrl = currentUser!.ProfileImage,
                FullName = currentUser.FullName
            };

            onlineUsers.TryAdd(userName, user);

            await Clients.AllExcept(ConnectionId).SendAsync("Notify", currentUser);
        }

        if (!string.IsNullOrEmpty(receiverId))
        {
            await LoadMessages(receiverId);
        }

        await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());
    }

    public async Task LoadMessages(string recipientId, int pageNumber = 1)
    {
        const int pageSize = 10;

        var userName = Context.User?.Identity?.Name;
        if (string.IsNullOrEmpty(userName))
            return;

        var currentUser = await userManager.FindByNameAsync(userName);
        if (currentUser == null)
            return;

        // Get messages between current user and recipient
        var messagesQuery = context.Messages
        .Where(m =>
            (m.ReceiverId == currentUser.Id && m.SenderId == recipientId) ||
            (m.SenderId == currentUser.Id && m.ReceiverId == recipientId))
        .OrderByDescending(m => m.CreatedDate);

        // Pagination
        var messagesList = await messagesQuery
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .OrderBy(m => m.CreatedDate) // Chronological order for display
            .Select(m => new MessageResponseDto
            {
                Id = m.Id,
                Content = m.Content,
                CreatedDate = m.CreatedDate,
                ReceiverId = m.ReceiverId,
                SenderId = m.SenderId
            })
            .ToListAsync();

        // Mark messages as read (only those received by the current user)
        var unreadMessages = await context.Messages
            .Where(m => m.ReceiverId == currentUser.Id &&
                        m.SenderId == recipientId &&
                        !m.IsRead)
            .ToListAsync();

        if (unreadMessages.Count > 0)
        {
            foreach (var msg in unreadMessages)
            {
                msg.IsRead = true;
            }

            await context.SaveChangesAsync();
        }

        await Clients.User(currentUser.Id).SendAsync("ReceiveMessageList", messagesList);
    }

    public async Task SendMessage(MessageRequestDto message)
    {
        var senderName = Context.User!.Identity!.Name!;
        var sender = await userManager.FindByNameAsync(senderName);
        var receiver = await userManager.FindByIdAsync(message.ReceiverId!);

        if (sender == null || receiver == null)
        {
            throw new Exception("Sender or receiver not found!");
        }

        var newMsg = new Message
        {
            SenderId = sender.Id,
            ReceiverId = receiver.Id,
            Sender = sender,
            Receiver = receiver,
            IsRead = false,
            CreatedDate = DateTime.UtcNow,
            Content = message.Content
        };

        context.Messages.Add(newMsg);
        await context.SaveChangesAsync();

        await Clients.User(receiver.Id).SendAsync("ReceiveNewMessage", newMsg);
    }

    public async Task NotifyTyping(string recipientUserName)
    {
        var senderUserName = Context.User!.Identity!.Name;

        if (senderUserName == null)
        {
            return;
        }

        var connectionId = onlineUsers.Values.FirstOrDefault(x => x.UserName == recipientUserName)?.ConnectionId;

        if (connectionId != null)
        {
            await Clients.Client(connectionId).SendAsync("NotifyTypingToUser", senderUserName);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userName = Context.User!.Identity!.Name;
        onlineUsers.TryRemove(userName!, out _);
        await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());
    }

    private async Task<IEnumerable<OnlineUserDto>> GetAllUsers()
    {
        var username = Context.User!.GetUserName();
        var onlineUsersSet = new HashSet<string>(onlineUsers.Keys);
        var users = await userManager.Users.Select(u => new OnlineUserDto
        {
            Id = u.Id,
            UserName = u.UserName,
            FullName = u.FullName,
            ProfileImageUrl = u.ProfileImage,
            IsOnline = onlineUsersSet.Contains(u.UserName!),
            UnreadCount = context.Messages.Count(x => x.ReceiverId == username && x.SenderId == u.Id && !x.IsRead)
        }).OrderByDescending(u => u.IsOnline).ToListAsync();

        return users;
    }
}

