-- Enforce one-to-one relationship between games and game_rules

-- First, add a unique constraint to game_id in game_rules table
ALTER TABLE "public"."game_rules" ADD CONSTRAINT "game_rules_game_id_unique" UNIQUE ("game_id");

-- Add a game_rule_id column to the games table to make the relationship bidirectional
ALTER TABLE "public"."games" ADD COLUMN "game_rule_id" UUID;

-- Add a foreign key constraint from games.game_rule_id to game_rules.id
ALTER TABLE "public"."games" ADD CONSTRAINT "games_game_rule_id_fkey" 
  FOREIGN KEY ("game_rule_id") REFERENCES "public"."game_rules"("id") ON DELETE SET NULL;

-- Create a function to update games.game_rule_id when a game_rule is created or updated
CREATE OR REPLACE FUNCTION public.update_game_rule_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the game's game_rule_id to point to this rule
  UPDATE public.games 
  SET game_rule_id = NEW.id,
      updated_at = NOW() 
  WHERE id = NEW.game_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update games.game_rule_id when a game_rule is inserted or updated
CREATE TRIGGER update_game_rule_id_trigger
AFTER INSERT OR UPDATE ON public.game_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_game_rule_id();

-- Update existing games to point to their game rules
UPDATE public.games g
SET game_rule_id = gr.id
FROM public.game_rules gr
WHERE g.id = gr.game_id;

-- Create a function to handle cleanup when a game rule is deleted
CREATE OR REPLACE FUNCTION public.handle_game_rule_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Set the game's game_rule_id to NULL when the rule is deleted
  UPDATE public.games 
  SET game_rule_id = NULL,
      has_complete_rules = FALSE,
      updated_at = NOW() 
  WHERE game_rule_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to handle cleanup when a game rule is deleted
CREATE TRIGGER handle_game_rule_delete_trigger
BEFORE DELETE ON public.game_rules
FOR EACH ROW
EXECUTE FUNCTION public.handle_game_rule_delete();

-- Update the existing update_game_rules_status function to handle the one-to-one relationship
CREATE OR REPLACE FUNCTION public.update_game_rules_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the game's has_complete_rules status based on the rules processing status
  IF NEW.processing_status = 'completed' THEN
    UPDATE public.games 
    SET has_complete_rules = TRUE, 
        updated_at = NOW() 
    WHERE id = NEW.game_id;
  ELSIF NEW.processing_status = 'error' THEN
    UPDATE public.games 
    SET has_complete_rules = FALSE, 
        updated_at = NOW() 
    WHERE id = NEW.game_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
