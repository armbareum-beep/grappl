import React, { Fragment } from 'react';

interface HighlightedTextProps {
    text: string | null | undefined;
    highlightClass?: string;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
    text,
    highlightClass = "text-violet-500"
}) => {
    if (!text) return null;

    // Split by {highlight} and then map parts
    const braceParts = text.split(/(\{.*?\})/);

    return (
        <>
            {braceParts.map((part, i) => {
                const isHighlight = part.startsWith('{') && part.endsWith('}');
                const content = isHighlight ? part.slice(1, -1) : part;

                // For each part, further split by \n to handle line breaks
                const lineParts = content.split('\n');

                const rendered = lineParts.map((line, j) => (
                    <Fragment key={`${i}-${j}`}>
                        {line}
                        {j < lineParts.length - 1 && <br />}
                    </Fragment>
                ));

                if (isHighlight) {
                    return (
                        <span key={i} className={highlightClass}>
                            {rendered}
                        </span>
                    );
                }
                return <Fragment key={i}>{rendered}</Fragment>;
            })}
        </>
    );
};
