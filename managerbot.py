import discord
from discord.ext import commands
import json
import os

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

ALLOWED_USER_ID = 841749813702688858

@bot.event
async def on_ready():
    print(f'{bot.user} has connected to Discord!')

@bot.command()
async def generate_code(ctx):
    if ctx.author.id != ALLOWED_USER_ID:
        await ctx.send('You are not authorized to use this command.')
        return

    import random
    import string
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    await ctx.send(f'Generated access code: `{code}`. Please use the admin panel to assign it to a user.')

@bot.command()
async def list_codes(ctx):
    if ctx.author.id != ALLOWED_USER_ID:
        await ctx.send('You are not authorized to use this command.')
        return

    try:
        with open('users.json', 'r') as f:
            users = json.load(f)
        
        if users:
            code_list = '\n'.join([f"User: {user['username']} | Code: {user.get('accessCode', 'No code')}" for user in users.values()])
            await ctx.send(f'**Access Codes:**\n```{code_list}```')
        else:
            await ctx.send('No access codes found.')
    except FileNotFoundError:
        await ctx.send('No access codes file found.')

@bot.command()
async def revoke_code(ctx, username):
    if ctx.author.id != ALLOWED_USER_ID:
        await ctx.send('You are not authorized to use this command.')
        return

    try:
        with open('users.json', 'r') as f:
            users = json.load(f)
        
        if username in users:
            users[username]['accessCode'] = None
            
            with open('users.json', 'w') as f:
                json.dump(users, f, indent=2)
            
            await ctx.send(f'Access code for user `{username}` has been revoked.')
        else:
            await ctx.send(f'User `{username}` not found.')
    except FileNotFoundError:
        await ctx.send('No users file found.')

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        token = sys.argv[1]
        bot.run(token)
    else:
        print("Bot token required as command line argument")
