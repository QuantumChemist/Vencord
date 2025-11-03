/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 rini
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Message, User } from "@vencord/discord-types";

interface UsernameProps {
    author: { nick: string; };
    message: Message;
    withMentionPrefix?: boolean;
    isRepliedMessage: boolean;
    userOverride?: User;
}

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "How to display usernames and nicks",
        options: [
            { label: "Username then nickname", value: "user-nick", default: true },
            { label: "Nickname then username", value: "nick-user" },
            { label: "Username only", value: "user" },
        ],
    },
    displayNames: {
        type: OptionType.BOOLEAN,
        description: "Use display names in place of usernames",
        default: false
    },
    inReplies: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Also apply functionality to reply previews",
    },
});

export default definePlugin({
    name: "ShowMeYourName",
    description: "Display usernames next to nicks, or no nicks at all",
    authors: [Devs.Rini, Devs.TheKodeToad],
    patches: [
        {
            find: '="SYSTEM_TAG"',
            replacement: {
                // The field is named "userName", but as this is unusual casing, the regex also matches username, in case they change it
                match: /(?<=onContextMenu:\i,children:)\i\?(?=.{0,100}?user[Nn]ame:)/,
                replace: "$self.renderUsername(arguments[0]),_oldChildren:$&"
            }
        },
    ],
    settings,

    renderUsername: ErrorBoundary.wrap(({ author, message, isRepliedMessage, withMentionPrefix, userOverride }: UsernameProps) => {
        try {
            const user = userOverride ?? message.author;
            console.log("User attributes:", Object.getOwnPropertyNames(user), user);
            let { username } = user;
            if (settings.store.displayNames)
                username = user.globalName || username;

            // Support for customized friend nickname
            // If user.friendNickname exists, use it as the preferred nickname
            const friendNickname = (user as any).friendNickname as string | undefined;
            const { nick } = author;
            const displayNick = friendNickname || nick;
            const prefix = withMentionPrefix ? "@" : "";

            if (isRepliedMessage && !settings.store.inReplies || username.toLowerCase() === displayNick.toLowerCase())
                return <>{prefix}{displayNick}</>;

            if (settings.store.mode === "user-nick")
                return <>{prefix}{username} <span className="vc-smyn-suffix">{displayNick}</span></>;

            if (settings.store.mode === "nick-user")
                return <>{prefix}{displayNick} <span className="vc-smyn-suffix">{username}</span></>;

            return <>{prefix}{username}</>;
        } catch {
            return <>{author?.nick}</>;
        }
    }, { noop: true }),
});
