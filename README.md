# Miyagi

Discord bots that can help people learn new words.

You can pass a word to the slash command `/stash` which will store
the word and return a definition for you to remember. This is
implemented using Workers and Workers KV.

A second bot will periodically choose a random word from the
previously stored words and ask you to define it. The aim is
to engage the user in active learning. This is implemented using
Worker Cron Triggers and Discord Webhooks.

