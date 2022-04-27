local common = loadfile("./common.lua")()

if not game:IsLoaded() then
    game.Loaded:Wait()
end

if game.PlaceId == 5602055394 then
    local Chat = game:GetService("ReplicatedStorage"):WaitForChild("DefaultChatSystemChatEvents")
    local ItemProperties = require(game.ReplicatedStorage.Modules.MainModule).ReturnList()

    local spawned = nil
    common.handleAccountInit(spawned)

    local function getItemProperties(item)
        local properties = ItemProperties[item]
        if properties == nil then
            return nil
        end
        return {
            ["rotate"] = properties["Rotate"],
            ["color"] = properties["Color"][1]["Value"]:ToHex()
        }
    end

    local function normalizeData(dataTable)
        local normalizedData = {}
        if dataTable == nil then
            return nil
        end
        normalizedData["id"] = dataTable["i"]["id"]
        for key, value in pairs(dataTable["i"]) do
            if string.find(key, "Player") == nil then
                local id = string.match(key, "(%d+)%D*$")
                if id ~= nil then
                    normalizedData[id] = normalizedData[id] or {}
                    if string.find(key, "Offer") then
                        local offerData = {}
                        if value ~= nil then
                            for _, item in ipairs(value) do
                                local rawItemName = tostring(item["Item"])
                                local item_name = string.sub(rawItemName, 3, string.len(rawItemName))
                                local item_type = string.sub(rawItemName, 1, 2)
                                local properties = getItemProperties(item_name)
                                local itemData = {
                                    name = item_name,
                                    type = 'unknown'
                                }
                                if (item_type == "K_") then
                                    itemData['type'] = "stomp"
                                elseif item_type == "T_" then
                                    itemData['type'] = "tag"
                                elseif item_type == "R_" then
                                    itemData['type'] = "color"
                                end
                                if properties ~= nil then
                                    itemData['properties'] = properties
                                end
                                table.insert(offerData, itemData)
                            end
                            normalizedData[id]["Offer"] = offerData
                        else
                            normalizedData[id]["Offer"] = nil
                        end
                    elseif string.find(key, "Accepted") then
                        normalizedData[id]["Accepted"] = value
                    end
                end
            end
        end
        return normalizedData
    end

    local function getTradeData()
        local raw_data = game.ReplicatedStorage.fatex.Check:InvokeServer(game.Players.LocalPlayer, "d12ndu2efnwgu13f")
        return normalizeData(raw_data)
    end

    local function sendTrade(player)
        game.ReplicatedStorage.fatex:FireServer("RequestTrade", player)
    end

    local function acceptTrade(player, tid)
        game.ReplicatedStorage.fatex:FireServer("AcceptTrade", player, tid)
    end

    local function declineTrade(player, tid)
        game.ReplicatedStorage.fatex:FireServer("DeclineTrade", player, tid)
    end

    local function getInventory(max)
        local raw_inv = game.Players.LocalPlayer.Information.Inventory:GetChildren()
        local inv_length = common.tablelength(raw_inv)
        if max == nil or max ~= nil and max > inv_length then
            max = inv_length
        end
        local inventory = {}
        for i, child in pairs(raw_inv) do
            table.insert(inventory, child)
            if i == max then
                break
            end
        end
        return inventory
    end

    local function addAllItemsToTrade(receiver)
        local data = getTradeData()
        for _, child in pairs(getInventory(10)) do
            game.ReplicatedStorage.fatex:FireServer("AddUpItem", receiver, child, data["id"])
            task.wait(2)
        end
    end

    local function waitForTradeAcceptance()
        local data = getTradeData()
        while data == nil do
            task.wait(2)
            data = getTradeData()
        end
        return data
    end

    local function handleReleaseCommand(ticketId, player)
        local done = false
        local hasToRetry = false
        while not done and task.wait(2) do
            local inventory = getInventory()
            if (common.tablelength(inventory) <= 0) then
                done = true
                break
            end
            common.sendMessage(player, "Sending trade...")
            sendTrade(player)
            common.sendMessage(player, "Trade has been sent, waiting for acceptance...")
            local data = waitForTradeAcceptance()
            if data then
                local acceptedTrade = false
                common.sendMessage(player, "Adding items to trade...")
                addAllItemsToTrade(player)
                common.sendMessage(player, "Items have been added, accept the trade")
                while task.wait(2) do
                    local newData = getTradeData()
                    if newData ~= nil and newData[tostring(player.UserId)]['Accepted'] and not acceptedTrade then
                        acceptTrade(player, newData['id'])
                        acceptedTrade = true
                    end
                    if newData == nil and acceptedTrade then
                        local newInventory = getInventory()
                        local invHasChanged = common.tablelength(newInventory) < common.tablelength(inventory)
                        if (invHasChanged) then
                            common.sendMessage(player, "Trade has been accepted")
                            break
                        else
                            common.sendMessage(player, "Trade has been cancelled, try again")
                            done = true
                            hasToRetry = true
                            break
                        end
                    end
                end
            end
        end
        if done and not hasToRetry then
            common.sendMessage(player, "Items have been released")
            common.updateDealStatus(ticketId, "DEAL_REDEEMED")
        end
    end

    local function handleSendCommand(ticketId, player)
        sendTrade(player)
        common.sendMessage(player, "Trade request has been sent to " .. player.Name .. "!")
        local notifiedOfStatus = false
        local notifiedOfWaiting = false
        local success = false
        local id = nil
        local declined = false
        local bypassInvCheck = false
        local oldInvSize = common.tablelength(getInventory())
        local expectedInvSize = 10
        local data = waitForTradeAcceptance()
        while true and task.wait(2) do
            local done = false
            data = getTradeData()
            if data and not declined then
                id = data['id']
                local hasAccepted = data[tostring(player.UserId)]['Accepted']
                local trade = common.sendRequest("deal/" .. ticketId .. "/trade/" .. id, "GET")
                if hasAccepted then
                    if not common.isValidResponse(trade) and not notifiedOfWaiting then
                        expectedInvSize = common.tablelength(data[tostring(player.UserId)]['Offer']) + oldInvSize
                        trade = common.sendRequest("deal/" .. ticketId .. "/trade", "POST", {
                            id = id,
                            items = data[tostring(player.UserId)]['Offer']
                        })
                        common.sendMessage(player, "Waiting for receiver to accept trade in escrow")
                        notifiedOfWaiting = true
                    end
                    if trade ~= nil and not notifiedOfStatus then
                        if trade.status == "ACCEPTED" then
                            common.sendMessage(player, "Trade has been accepted in escrow")
                            notifiedOfStatus = true
                            acceptTrade(player, data.id)
                        elseif trade.status == "DECLINED" then
                            common.sendMessage(player, "Trade has been rejected in escrow")
                            notifiedOfStatus = true
                            declineTrade(player, data.id)
                        end
                    end
                elseif common.isValidResponse(trade) then
                    declineTrade(player, data.id)
                    bypassInvCheck = true
                    declined = true

                end
            elseif not bypassInvCheck then
                local newInvSize = common.tablelength(getInventory())
                if newInvSize >= expectedInvSize then
                    success = true
                else
                    declined = true
                end
                done = true
            end
            if done or declined then
                break
            end
        end
        if success then
            common.sendRequest("deal/" .. ticketId .. "/trade/" .. id, "PATCH", {
                status = "ACCEPTED"
            })
            common.sendMessage(player, "Trade has been completed")
        elseif declined then
            common.sendRequest("deal/" .. ticketId .. "/trade/" .. id, "PATCH", {
                status = "DECLINED"
            })
            common.sendMessage(player, "You have declined the trade or changed the trade after it was sent to escrow")
        end
    end

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

    Chat:WaitForChild("OnMessageDoneFiltering").OnClientEvent:Connect(function(object)
        local msg = object.Message
        local playerId = game.Players:GetUserIdFromNameAsync(object.FromSpeaker)
        local player = game.Players:GetPlayerByUserId(playerId)
        local ticket = common.sendRequest("tid/" .. game.Players.LocalPlayer.UserId, "GET")
        if common.isValidResponse(ticket) then
            local ticketId = ticket.id
            local info = common.sendRequest("deal/" .. ticketId, "GET")
            if common.isValidResponse(info) then
                local isSender = info.seller == tostring(playerId)
                local isReceiver = info.buyer == tostring(playerId)
                if msg == "$release" then
                    if info.status == "DEAL_RELEASED" and isReceiver then
                        handleReleaseCommand(ticketId, player)
                    elseif isReceiver then
                        common.sendMessage(player, "The deal has not been released yet")
                    else
                        common.sendMessage(player, "You are not the receiver of this deal")
                    end
                elseif msg == "$send" then
                    if info.status == "READY_TO_TRADE" and isSender then
                        handleSendCommand(ticketId, player)
                    elseif isSender then
                        common.sendMessage(player, "The deal has not been released yet")
                    else
                        common.sendMessage(player, "You are not the sender of this deal")
                    end
                end
            end

        end
    end)

    common.handlePlayerIdle()
end
