import { resetIds, Stylesheet } from "@fluentui/react";
import { enableStaticRendering } from 'mobx-react-lite';
import Document, { DocumentContext, DocumentInitialProps } from 'next/document';

enableStaticRendering(true);

const stylesheet = Stylesheet.getInstance();

export default class MyDocument extends Document {
    static async getInitialProps(context: DocumentContext): Promise<DocumentInitialProps> {
        resetIds();

        const { html, head, styles, ...rest } = await Document.getInitialProps(context);

        return {
            ...rest,
            html,
            head: [
                ...(head ?? []),
                <meta httpEquiv="Cross-Origin-Opener-Policy" content="same-origin" />,
                <meta httpEquiv="Cross-Origin-Embedder-Policy" content="require-corp" />,
                <script key="fluentui" dangerouslySetInnerHTML={{
                    __html: `
                        window.FabricConfig = window.FabricConfig || {};
                        window.FabricConfig.serializedStylesheet = ${stylesheet.serialize()};
                    `
                }} />
            ],
            styles: (
                <>
                    {styles}
                    <style dangerouslySetInnerHTML={{ __html: stylesheet.getRules() }} />
                </>
            )
        };
    }
}
