CREATE OR REPLACE FUNCTION verses_text_search_update()
RETURNS trigger AS $$
BEGIN
  NEW.text_search := to_tsvector('english', NEW.text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER verses_text_search_trigger
BEFORE INSERT OR UPDATE ON verses
FOR EACH ROW
WHEN (TG_OP = 'INSERT' OR OLD.text IS DISTINCT FROM NEW.text)
EXECUTE FUNCTION verses_text_search_update();
