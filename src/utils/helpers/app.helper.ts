export const formatDateToHumanFriendly = (date: Date, options: { withTime?: boolean } = { withTime: true }): string => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "Invalid Date";
    }

    const formatterOptions: Intl.DateTimeFormatOptions = {
        timeZone: "Africa/Lagos", // Nigerian timezone (WAT, UTC+1)
        month: "long",
        day: "numeric",
        year: "numeric",
    };

    if (options.withTime) {
        formatterOptions.hour = "numeric";
        formatterOptions.minute = "2-digit";
        formatterOptions.hour12 = true;
    }

    return date.toLocaleString("en-US", formatterOptions);
};
