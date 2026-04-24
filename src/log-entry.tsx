import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  LaunchProps,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  formatDateTime,
  formatDurationLong,
  renderTimelinePlain,
  sumWorkMs,
} from "./lib/format";
import { appendEntry, expandHome } from "./lib/journal";
import { clearState, getState, Segment } from "./lib/state";

type LaunchContext = {
  sessionStartedAt: number;
  sessionEndedAt: number;
  segments: Segment[];
};

type Preferences = {
  worklogFile: string;
};

type FormValues = {
  details: string;
};

export default function Command(
  props: LaunchProps<{
    launchContext?: LaunchContext;
    draftValues?: FormValues;
  }>,
) {
  const [session, setSession] = useState<LaunchContext | null>(
    props.launchContext ?? null,
  );
  const [loading, setLoading] = useState<boolean>(props.launchContext == null);

  useEffect(() => {
    if (session !== null) return;
    (async () => {
      const state = await getState();
      if (state.sessionStartedAt !== null && state.segments.length > 0) {
        const lastSegment = state.segments[state.segments.length - 1];
        const sessionEndedAt = lastSegment.endedAt ?? Date.now();
        setSession({
          sessionStartedAt: state.sessionStartedAt,
          sessionEndedAt,
          segments: state.segments,
        });
      }
      setLoading(false);
    })();
  }, [session]);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: { details: props.draftValues?.details ?? "" },
    async onSubmit(values) {
      if (!session) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No session to log",
        });
        return;
      }
      const preferences = getPreferenceValues<Preferences>();
      const filePath = preferences.worklogFile?.trim() || "~/worklog.md";
      try {
        const writtenTo = await appendEntry(filePath, {
          sessionStartedAt: session.sessionStartedAt,
          sessionEndedAt: session.sessionEndedAt,
          segments: session.segments,
          details: values.details,
        });
        await clearState();
        await showToast({
          style: Toast.Style.Success,
          title: "Entry saved",
          message: writtenTo,
        });
        await popToRoot();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not write journal entry";
        await showToast({
          style: Toast.Style.Failure,
          title: "Write failed",
          message,
        });
      }
    },
    validation: {
      details: (value) => {
        if (!value || value.trim().length === 0)
          return "Write something about this session";
      },
    },
  });

  if (loading) {
    return <Form isLoading />;
  }

  if (!session) {
    return (
      <Form>
        <Form.Description
          title="No active session"
          text="There's no timer session to log. Start one from the menu bar or from Raycast."
        />
      </Form>
    );
  }

  const totalMs = session.sessionEndedAt - session.sessionStartedAt;
  const activeMs = sumWorkMs(session.segments, session.sessionEndedAt);
  const summary = `Session: ${formatDateTime(session.sessionStartedAt)} → ${formatDateTime(
    session.sessionEndedAt,
  )}\nActive: ${formatDurationLong(activeMs)}  ·  Total: ${formatDurationLong(totalMs)}`;
  const timeline = renderTimelinePlain(
    session.segments,
    session.sessionEndedAt,
  );
  const preferences = getPreferenceValues<Preferences>();
  const filePath = preferences.worklogFile?.trim() || "~/worklog.md";

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Entry" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Session" text={summary} />
      <Form.Description title="Timeline" text={timeline} />
      <Form.TextArea
        title="Journal Entry"
        placeholder="What did you work on? Markdown welcome."
        enableMarkdown
        {...itemProps.details}
      />
      <Form.Description title="Saving to" text={expandHome(filePath)} />
    </Form>
  );
}
