local QuartoRustVersion = "0.1.0"
local hasDoneRustSetup = false
local counter = 0

-- quarto.doc.include_file("after-body", "highlight.js")
-- quarto.doc.include_file("after-body", "rust-playground.js")

local function ensureRustSetup()
  if hasDoneRustSetup then
    return
  end

  hasDoneRustSetup = true


  quarto.doc.add_html_dependency({
    name = "rust-playground",
    version = QuartoRustVersion,
    scripts = {
      { path = "highlight.js", afterBody = true },
      { path = "rust-playground.js", afterBody = true } 
    },
  })

end


-- Initialize a table that contains the default cell-level options
local qwebRDefaultCellOptions = {
  ["context"] = "interactive"
}

-- Copy the top level value and its direct children
-- Details: http://lua-users.org/wiki/CopyTable
local function shallowcopy(original)
  -- Determine if its a table
  if type(original) == 'table' then
    -- Copy the top level to remove references
    local copy = {}
    for key, value in pairs(original) do
        copy[key] = value
    end
    -- Return the copy
    return copy
  else
    -- If original is not a table, return it directly since it's already a copy
    return original
  end
end

-- Custom method for cloning a table with a shallow copy.
function table.clone(original)
  return shallowcopy(original)
end

local function mergeCellOptions(localOptions)
  -- Copy default options to the mergedOptions table
  local mergedOptions = table.clone(qwebRDefaultCellOptions)

  -- Override default options with local options
  for key, value in pairs(localOptions) do
    mergedOptions[key] = value
  end

  -- Return the customized options
  return mergedOptions
end



-- Extract Quarto code cell options from the block's text
local function extractCodeBlockOptions(block)
  
  -- Access the text aspect of the code block
  local code = block.text

  -- Define two local tables:
  --  the block's attributes
  --  the block's code lines
  local cellOptions = {}
  local newCodeLines = {}

  -- Iterate over each line in the code block 
  for line in code:gmatch("([^\r\n]*)[\r\n]?") do
    -- Check if the line starts with "#|" and extract the key-value pairing
    -- e.g. #| key: value goes to cellOptions[key] -> value
    local key, value = line:match("^//|%s*(.-):%s*(.-)%s*$")

    -- If a special comment is found, then add the key-value pairing to the cellOptions table
    if key and value then
      cellOptions[key] = value
    else
      -- Otherwise, it's not a special comment, keep the code line
      table.insert(newCodeLines, line)
    end
  end

  -- Merge cell options with default options
  cellOptions = mergeCellOptions(cellOptions)

  -- Set the codeblock text to exclude the special comments.
  cellCode = table.concat(newCodeLines, '\n')

  -- Return the code alongside options
  return cellCode, cellOptions
end


local function isVariableEmpty(s)
  return s == nil or s == ''
end



-- Remove lines with only whitespace until the first non-whitespace character is detected.
local function removeEmptyLinesUntilContent(codeText)
  -- Iterate through each line in the codeText table
  for _, value in ipairs(codeText) do
      local detectedWhitespace = string.match(value, "^%s*$")
      if isVariableEmpty(detectedWhitespace) then
          table.remove(codeText, 1)
      else
          break
      end
  end
  return codeText
end



function strsplit(str, pat)
   local t = {}
   local fpat = "(.-)" .. pat
   local last_end = 1
   local s, e, cap = str:find(fpat, 1)
   while s do
      if s ~= 1 or cap ~= "" then
         table.insert(t, cap)
      end
      last_end = e+1
      s, e, cap = str:find(fpat, last_end)
   end
   if last_end <= #str then
      cap = str:sub(last_end)
      table.insert(t, cap)
   end
   return t
end

function CodeBlock(el)

  ensureRustSetup()

  local no_attrs = not el.attr
  local not_html = not quarto.doc.is_format("html")
  local not_rust = not el.attr.classes:includes("{playground-rust}")

  quarto.log.output("-- Input ---------------------------------------------------------")
  quarto.log.output(el)

  if no_attrs or not_html or not_rust then
    quarto.log.output("-- No adjustment")
    return el
  end

  counter = counter + 1

  cellCode, cellOpts = extractCodeBlockOptions(el)

  cellCode = removeEmptyLinesUntilContent(cellCode)

  el["text"] = cellCode

  local new_classes = strsplit(cellOpts["classes"], "%s+")
  -- It seems the 'r' class is what causes nice formatting (including a copy 
  -- button) to be applied; not the 'cell-code' class >:(
  table.insert(new_classes, 1, "r")
  table.insert(new_classes, 1, "cell-code")
  el["attr"]["classes"] = new_classes

  quarto.log.output("-- Adjusted ---------------------------------------------------------")
  quarto.log.output(el)

  return el

end
