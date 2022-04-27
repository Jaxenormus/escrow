local common = loadfile("common.lua")()

if not game:IsLoaded() then
    game.Loaded:Wait()
end

if game.PlaceId == 920587237 then
    local ItemImages = {}

    local spawned = nil
    -- Wait for player to spawn and navigate start menu
    while spawned == nil and task.wait(1) do
        spawned = game:GetService("Workspace"):FindFirstChild(game.Players.LocalPlayer.Name)
        local newsGui = game.Players.LocalPlayer.PlayerGui:FindFirstChild("NewsApp")
        if newsGui and newsGui.Enabled == true then
            local PlayButton = newsGui.EnclosingFrame.MainFrame.Contents.PlayButton
            for _, v in pairs(getconnections(PlayButton["MouseButton1Click"])) do
                v:Fire()
            end
            task.wait(1)
            local ParentButton = game.Players.LocalPlayer.PlayerGui.DialogApp.Dialog.RoleChooserDialog.Baby
            for _, v in pairs(getconnections(ParentButton["MouseButton1Click"])) do
                v:Fire()
            end
            game.Players.LocalPlayer.PlayerGui.DialogApp.Dialog.Visible = false
            spawned = game:GetService("Workspace"):FindFirstChild(game.Players.LocalPlayer.Name)
        end
    end

    common.handleAccountInit(spawned)

    local Chat = game:GetService("ReplicatedStorage"):WaitForChild("DefaultChatSystemChatEvents")
    local load_ = require(game.ReplicatedStorage:WaitForChild("Fsys")).load
    local Router = load_("RouterClient")
    local Data = load_("ClientData")
    local InvDb = load_("InventoryDB")

    local function handleTradeCancelation(callback)
        local meta = getrawmetatable(game)
        setreadonly(meta, false)
        local old_meta = meta.__namecall
        meta.__namecall = function(self, ...)
            local method = getnamecallmethod()
            if method == "FireServer" then
                if tostring(self, unpack({...})) == Router.get("TradeAPI/DeclineTrade").Name then
                    old_meta(self, ...)
                    spawn(callback)
                    return
                end
            end
            return old_meta(self, ...)
        end
    end

    local function handleReleaseCommand(ticketId, player)
        local done = false
        while not done and task.wait(2) do
            -- local cancelled = false
            local isConcluded = false
            local inventory = Data.get("inventory")
            if (common.tablelength(inventory.pets) <= 1) then
                done = true
                break
            end
            local pets = {}
            for _, pet in pairs(inventory.pets) do
                table.insert(pets, pet)
                if common.tablelength(pets) == 9 then
                    break
                end
            end
            Router.get("TradeAPI/SendTradeRequest"):FireServer(player)
            local data = Data.get("trade")
            if data then
                common.sendMessage(player, "Adding pets to trade...")
                for _, pet in pairs(pets) do
                    Router.get("TradeAPI/AddItemToOffer"):FireServer(pet.unique)
                end
                common.sendMessage(player, "Finished adding pets to trade, accept the trade")
                -- handleTradeCancelation(
                --     function()
                --         sendMessage("Trade has been declined, sending new trade")
                --         cancelled = true
                --     end
                -- )
                while not isConcluded and task.wait(2) do
                    local newData = Data.get("trade")
                    if newData.recipient_offer.negotiated then
                        Router.get("TradeAPI/AcceptNegotiation"):FireServer()
                    end
                    if newData.recipient_offer.confirmed then
                        Router.get("TradeAPI/ConfirmTrade"):FireServer()
                    end
                    local history = Router.get("TradeAPI/GetTradeHistory"):InvokeServer()
                    for _, v in pairs(history) do
                        if v.trade_id == newData.trade_id then
                            isConcluded = true
                            break
                        end
                    end
                    if isConcluded then
                        common.sendMessage(player, "Trade has been accepted")
                        break
                    end
                end
            end
        end
        if done then
            common.sendMessage(player, "Pets has been released successfully")
            common.updateDealStatus(ticketId, "DEAL_REDEEMED")
        end
    end

    local function handleSendCommand(ticketId, player)
        Router.get("TradeAPI/SendTradeRequest"):FireServer(player)
        common.sendMessage(player, "Trade request has been sent")
        local notifiedOfAcceptance = false
        local notifiedOfWaiting = false
        local success = false
        local id = nil
        local declined = false
        handleTradeCancelation(function()
            declined = true
        end)
        while true and task.wait(2) do
            local done = false
            local data = Data.get("trade")
            -- If data is not nil then the trade is still open
            if data and not declined then
                id = data.trade_id
                local trade = common.sendRequest("deal/" .. ticketId .. "/trade/" .. id, "GET")
                local tradeDoesExist = common.isValidResponse(trade)
                -- Check to see if trade has been negotiated and that it has not been sent to escrow yet
                if data.recipient_offer.negotiated and not tradeDoesExist then
                    local items = {}
                    for _, item in pairs(data.recipient_offer.items) do
                        items[#items + 1] = {
                            id = item.unique,
                            image_id = ItemImages[item.id],
                            properties = {
                                rideable = item.properties.rideable or false,
                                flyable = item.properties.flyable or false,
                                neon = item.properties.neon or false,
                                mega_neon = item.properties.mega_neon or false
                            }
                        }
                    end
                    trade = common.sendRequest("deal/" .. ticketId .. "/trade", "POST", {
                        id = id,
                        items = items
                    })
                    if not notifiedOfWaiting then
                        common.sendMessage(player, "Waiting for buyer to accept trade in escrow")
                        notifiedOfWaiting = true
                    end
                end
                -- Check to see if trade has been sent to escrow
                if tradeDoesExist then
                    -- Check to see if trade has been accepted
                    if trade.status == "ACCEPTED" then
                        if not notifiedOfAcceptance then
                            common.sendMessage(player, "Trade has been accepted in escrow")
                            notifiedOfAcceptance = true
                        end
                        if data.recipient_offer.negotiated then
                            Router.get("TradeAPI/AcceptNegotiation"):FireServer()
                        end
                        if data.recipient_offer.confirmed then
                            Router.get("TradeAPI/ConfirmTrade"):FireServer()
                        end
                    elseif trade.status == "DECLINED" then
                        Router.get("TradeAPI/DeclineTrade"):FireServer()
                        common.sendMessage(player, "Trade has been rejected in escrow")
                        done = true
                    end
                end
            else
                -- If data is nil then the trade has been closed so check to see if it was accepted
                local history = Router.get("TradeAPI/GetTradeHistory"):InvokeServer()
                for _, v in pairs(history) do
                    if v.trade_id == id then
                        done = true
                        success = true
                        break
                    end
                end
            end
            -- If the trade has been accepted then break
            if done or declined then
                break
            end
        end
        if success then
            local trade = common.sendRequest("deal/" .. ticketId .. "/trade/" .. id, "GET")
            local inventory = Data.get("inventory")
            local allItemsSecured = true
            for _, item in pairs(trade.items) do
                local found = false
                for _, invItem in pairs(inventory.pets) do
                    if item.id == invItem.unique then
                        found = true
                        break
                    end
                end
                if not found then
                    allItemsSecured = false
                end
            end
            if allItemsSecured then
                common.sendMessage(player, "Trade has been completed")
                common.sendRequest("deal/" .. ticketId .. "/trade/" .. id, "PATCH", {
                    status = "ACCEPTED"
                })
            else
                common.sendMessage(player, "All items confirmed in escrow are not in inventory")
                common.sendRequest("deal/" .. ticketId .. "/trade/" .. id, "PATCH", {
                    status = "DECLINED"
                })
            end
        elseif declined then
            common.sendRequest("deal/" .. ticketId .. "/trade/" .. id, "PATCH", {
                status = "DECLINED"
            })
            common.sendMessage(player, "You have declined the trade")
        end
    end

    for k, v in pairs(InvDb) do
        for k1, v1 in pairs(v) do
            name = k1
            image = v1["image"]:gsub("rbxassetid://", "")
            if #image ~= 0 then
                ItemImages[name] = image
            end
        end
    end

    common.handlePlayerJoin()

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
