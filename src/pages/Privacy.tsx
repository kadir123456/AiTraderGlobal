import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Privacy = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">{t('privacy.title')}</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">{t('privacy.section1_title')}</h2>
            <p className="text-muted-foreground">
              {t('privacy.section1_content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">{t('privacy.section2_title')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('privacy.section2_content')}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>{t('privacy.section2_item1')}</li>
              <li>{t('privacy.section2_item2')}</li>
              <li>{t('privacy.section2_item3')}</li>
              <li>{t('privacy.section2_item4')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">{t('privacy.section3_title')}</h2>
            <p className="text-muted-foreground">
              {t('privacy.section3_content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">{t('privacy.section4_title')}</h2>
            <p className="text-muted-foreground">
              {t('privacy.section4_content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">{t('privacy.section5_title')}</h2>
            <p className="text-muted-foreground">
              {t('privacy.section5_content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">{t('privacy.section6_title')}</h2>
            <p className="text-muted-foreground">
              {t('privacy.section6_content')}
            </p>
          </section>

          <div className="border-t pt-6 mt-8">
            <p className="text-sm text-muted-foreground">
              {t('privacy.last_updated')}: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;