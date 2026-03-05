import type { Block } from '@/contracts/types';
import { CodeBlock } from '@/components/content/CodeBlock';
import type { ReactNode } from 'react';

interface PostContentProps {
  content: Block[];
}

export function PostContent({ content }: PostContentProps) {
  if (!content || content.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        暂无内容
      </div>
    );
  }

  return (
    <div className="prose-notion max-w-none">
      <BlockFlowRenderer content={content} />
    </div>
  );
}

function BlockFlowRenderer({ content }: { content: Block[] }) {
  const nodes: ReactNode[] = [];

  for (let index = 0; index < content.length; index++) {
    const block = content[index];

    if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
      const listType = block.type;
      const items: Block[] = [block];
      let cursor = index + 1;

      while (cursor < content.length && content[cursor].type === listType) {
        items.push(content[cursor]);
        cursor++;
      }

      if (listType === 'bulleted_list_item') {
        nodes.push(
          <ul key={`ul-${block.id || index}`} className="notion-list notion-list--bullet">
            {items.map((item, itemIndex) => (
              <li
                key={item.id || `${index}-${itemIndex}`}
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            ))}
          </ul>
        );
      } else {
        nodes.push(
          <ol key={`ol-${block.id || index}`} className="notion-list notion-list--number">
            {items.map((item, itemIndex) => (
              <li
                key={item.id || `${index}-${itemIndex}`}
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            ))}
          </ol>
        );
      }

      index = cursor - 1;
      continue;
    }

    nodes.push(<BlockRenderer key={block.id || index} block={block} />);
  }

  return <>{nodes}</>;
}

function BlockRenderer({ block }: { block: Block }) {
  const renderHtml = (tag: 'p' | 'h2' | 'h3' | 'h4' | 'li' | 'blockquote', className?: string) => {
    const Tag = tag;
    return (
      <Tag
        className={className}
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
    );
  };

  switch (block.type) {
    case 'paragraph':
      return (
        <p
          id={block.id}
          className="notion-paragraph scroll-mt-24"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );

    case 'heading_1':
      return (
        <h2
          id={block.id}
          className="notion-heading notion-heading--h1 scroll-mt-24"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );

    case 'heading_2':
      return (
        <h3
          id={block.id}
          className="notion-heading notion-heading--h2 scroll-mt-24"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );

    case 'heading_3':
      return (
        <h4
          id={block.id}
          className="notion-heading notion-heading--h3 scroll-mt-24"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );

    case 'code':
      return <CodeBlock code={block.content} language={(block.props?.language as string) || 'text'} />;

    case 'quote':
      return renderHtml('blockquote', 'notion-quote');

    case 'image': {
      const caption = block.props?.caption as string | undefined;
      return (
        <figure className="my-8">
          <img
            src={block.content}
            alt={caption || ''}
            className="w-full rounded-lg"
          />
          {caption && (
            <figcaption className="text-center text-sm text-muted-foreground mt-2">
              {caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case 'bulleted_list_item':
    case 'numbered_list_item':
      return null;

    case 'divider':
      return <hr className="notion-divider" />;

    case 'callout': {
      const icon = block.props?.icon as string | undefined;
      return (
        <div className="flex gap-4 p-4 bg-muted rounded-lg my-6">
          {icon && <span className="text-2xl">{icon}</span>}
          <div dangerouslySetInnerHTML={{ __html: block.content }} />
        </div>
      );
    }

    default:
      return null;
  }
}
