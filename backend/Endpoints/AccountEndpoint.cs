using System;
using backend.Common;
using backend.DTOs;
using backend.Extensions;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class AccountEndpoint
{
    public static RouteGroupBuilder MapAccountEndpoint(this WebApplication app)
    {
        var group = app.MapGroup("/api/account").WithTags("account");

        group.MapPost("/register", async (HttpContext context, UserManager<AppUser>
        UserManager, [FromForm] string fullName, [FromForm] string email, [FromForm] string password,
        [FromForm] string userName, [FromForm] IFormFile? profileImage) =>
        {
            var userFromDb = await UserManager.FindByEmailAsync(email);

            if (userFromDb != null)
            {
                return Results.BadRequest(Response<string>.Failure("User already exists."));
            }
            if (profileImage == null)
            {
                return Results.BadRequest(Response<string>.Failure("image is required"));
            }

            var picture = await FileUpload.Upload(profileImage);
            picture = $"{context.Request.Scheme}://{context.Request.Host}/uploads/{picture}";

            var user = new AppUser
            {
                Email = email,
                FullName = fullName,
                UserName = userName,
                ProfileImage = picture
            };

            var result = await UserManager.CreateAsync(user, password);

            if (!result.Succeeded)
            {
                return Results.BadRequest(Response<string>.Failure(result.Errors.Select(x => x.Description).FirstOrDefault()!));
            }

            return Results.Ok(Response<string>.Success("", "User created Successfully!"));
        }).DisableAntiforgery();

        group.MapPost("/login", async (UserManager<AppUser> UserManager, TokenService tokenService, LoginDto dto) =>
        {
            if (dto == null)
            {
                return Results.BadRequest(Response<string>.Failure("Invalid login details"));
            }

            var user = await UserManager.FindByEmailAsync(dto.Email);

            if (user == null)
            {
                return Results.BadRequest(Response<string>.Failure("User not found"));
            }

            var result = await UserManager.CheckPasswordAsync(user!, dto.Password);

            if (!result)
            {
                return Results.BadRequest(Response<string>.Failure("Invalid password"));
            }

            var token = tokenService.GenerateToken(user.Id, user.UserName!);

            return Results.Ok(Response<string>.Success(token, "Login Successful"));
        });

        group.MapGet("/me", async (HttpContext context, UserManager<AppUser> userManager) =>
        {
            var CurrentLoggedInUserId = context.User.GetUserId();
            var CurrentLoggedInUser = await userManager.Users.SingleOrDefaultAsync(x =>
            x.Id == CurrentLoggedInUserId.ToString()
            );

            return Results.Ok(Response<AppUser>.Success(CurrentLoggedInUser!, "User fetched Successfully!"));
        }).RequireAuthorization();

        return group;
    }
}
