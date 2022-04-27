local Json = loadstring(game:HttpGet("https://github.com/rxi/json.lua/raw/master/json.lua"))()
local Chat = game:GetService("ReplicatedStorage"):WaitForChild("DefaultChatSystemChatEvents")

local common = {}

function common.tablelength(table)
    local count = 0
    for _ in pairs(table) do
        count = count + 1
    end
    return count
end

function common.isValidResponse(response)
    return type(response) ~= "boolean"
end

function common.sendRequest(url, method, data)
    local params = {
        Url = "http://localhost:4000/v1/game/" .. url,
        Method = method
    }
    if method ~= "GET" then
        params.Body = Json.encode(data)
        params.Headers = {
            ["Content-Type"] = "application/json"
        }
    end
    local response = syn.request(params)
    if response.StatusCode ~= 200 then
        return false
    else
        return Json.decode(response.Body)
    end
end

function common.updateDealStatus(tid, status)
    common.sendRequest("deal/" .. tid, "PATCH", {
        status = status
    })
end

function common.handleAccountInit(spawned)
    while spawned == nil and task.wait(1) do
        spawned = game:GetService("Players"):FindFirstChild(game.Players.LocalPlayer.Name)
    end
    local res = common.sendRequest('account/' .. game.Players.LocalPlayer.UserId .. '/ready', "GET")
    if res.action == "SHUTDOWN" then
        game:Shutdown()
    end
end

function common.handlePlayerIdle()
    game:GetService("Players").LocalPlayer.Idled:Connect(function()
        local VirtualUser = game:GetService("VirtualUser")
        VirtualUser:CaptureController()
        VirtualUser:SetKeyDown("0x77")
        task.wait(1)
        VirtualUser:SetKeyUp("0x77")
    end)
end

function common.sendMessage(player, message)
    local placeId = game.PlaceId
    if placeId == 5602055394 then
        game.ReplicatedStorage.fatex.Check:InvokeServer(player, "d12ndu2efnwgu13f", message, "Trade System");
    else
        Chat.SayMessageRequest:FireServer(message, "All")
    end
end

function common.handlePlayerJoin()
    game.Players.PlayerAdded:Connect(function(player)
        local ticket = common.sendRequest("tid/" .. game.Players.LocalPlayer.UserId, "GET")
        if common.isValidResponse(ticket) then
            local ticketId = ticket.id
            local info = common.sendRequest("deal/" .. ticketId, "GET")
            if common.isValidResponse(info) then
                if info.status == "WAITING_FOR_SENDER" then
                    if tostring(player.UserId) == info.seller then
                        common.sendMessage(player, "Go back to escrow and read the instructions")
                        common.updateDealStatus(ticketId, "READY_TO_TRADE")
                    else
                        common.sendMessage(player, "This is not the account selected in escrow")
                    end
                else
                    common.sendMessage(player, "The deal has already been started")
                end
            else
                common.sendMessage(player, "Ran into issue connecting to escrow, please rejoin")
            end
        end
    end)
end

return common
